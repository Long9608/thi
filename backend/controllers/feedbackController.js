const { getPool, sql } = require('../config/db');
const { getAccessScope, getCurrentResidentId } = require('../utils/accessScope');

exports.getAllFeedbacks = async (req, res) => {
  try {
    const { search = '', rating = '', status = '', page = 1, limit = 999 } = req.query;
    const pool = await getPool();
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT
        f.FeedbackID,
        f.Title,
        f.Content,
        f.Rating,
        f.Reply,
        f.CreatedDate,
        r.FullName AS ResidentName,
        (
          SELECT TOP 1 a.ApartmentCode
          FROM ContractResident cr
          JOIN Contract c ON cr.ContractID = c.ContractID
          JOIN Apartment a ON c.ApartmentID = a.ApartmentID
          WHERE cr.ResidentID = r.ResidentID
            AND cr.MoveOutDate IS NULL
            AND c.StatusID = 2
          ORDER BY c.SignDate DESC
        ) AS ApartmentCode
      FROM Feedback f
      INNER JOIN Resident r ON f.ResidentID = r.ResidentID
      WHERE 1 = 1
    `;

    let countQuery = `
      SELECT COUNT(*) AS total
      FROM Feedback f
      INNER JOIN Resident r ON f.ResidentID = r.ResidentID
      WHERE 1 = 1
    `;

    const request = pool.request();

    const accessScope = getAccessScope(req, { viewAll: 'FEEDBACK_VIEW_ALL', viewOwn: 'FEEDBACK_VIEW_OWN' });
    if (accessScope === 'none') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem phản ánh' });
    }
    if (accessScope === 'own') {
      query += ` AND r.UserID = @CurrentUserID`;
      countQuery += ` AND r.UserID = @CurrentUserID`;
      request.input('CurrentUserID', sql.Int, req.userId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      query += ` AND (f.Title LIKE @Search OR f.Content LIKE @Search OR r.FullName LIKE @Search)`;
      countQuery += ` AND (f.Title LIKE @Search OR f.Content LIKE @Search OR r.FullName LIKE @Search)`;
      request.input('Search', sql.NVarChar, searchPattern);
    }

    if (rating) {
      query += ` AND f.Rating = @Rating`;
      countQuery += ` AND f.Rating = @Rating`;
      request.input('Rating', sql.Int, parseInt(rating, 10));
    }

    if (status) {
      if (status === 'pending') {
        query += ` AND (f.Reply IS NULL OR f.Reply = '')`;
        countQuery += ` AND (f.Reply IS NULL OR f.Reply = '')`;
      } else if (status === 'replied') {
        query += ` AND (f.Reply IS NOT NULL AND f.Reply <> '')`;
        countQuery += ` AND (f.Reply IS NOT NULL AND f.Reply <> '')`;
      }
    }

    const countResult = await request.query(countQuery);
    const total = countResult.recordset[0]?.total || 0;

    query += `
      ORDER BY f.CreatedDate DESC
      OFFSET @Offset ROWS
      FETCH NEXT @Limit ROWS ONLY
    `;
    request.input('Offset', sql.Int, offset);
    request.input('Limit', sql.Int, parseInt(limit, 10));

    const result = await request.query(query);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        totalPages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (error) {
    console.error('Get feedbacks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedbacks',
      error: error.message
    });
  }
};

exports.createFeedback = async (req, res) => {
  try {
    const { title, content, rating } = req.body;
    if (typeof title !== 'string' || !title.trim() || title.length > 200 || typeof content !== 'string' || !content.trim() || content.length > 10000 || (rating !== undefined && (!Number.isInteger(Number(rating)) || Number(rating)<1 || Number(rating)>5))) {
      return res.status(400).json({ success:false, message:'Tiêu đề, nội dung hoặc đánh giá (1–5 sao) không hợp lệ' });
    }
    if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required' });
    }
    const residentId = await getCurrentResidentId(await getPool(), req.userId);
    if (!residentId) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Tài khoản chưa liên kết cư dân' });
    }
    const pool = await getPool();
    const result = await pool.request()
      .input('ResidentID', sql.Int, residentId)
      .input('Title', sql.NVarChar, title)
      .input('Content', sql.NVarChar, content)
      .input('Rating', sql.Int, rating === undefined ? null : rating)
      .query(`
        INSERT INTO Feedback (ResidentID, Title, Content, Rating, CreatedDate)
        OUTPUT INSERTED.FeedbackID
        VALUES (@ResidentID, @Title, @Content, @Rating, GETDATE())
      `);
    return res.status(201).json({ success: true, data: { feedbackId: result.recordset[0].FeedbackID } });
  } catch (error) {
    console.error('Create feedback error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create feedback' });
  }
};

exports.getFeedbackById = async (req, res) => {
  try {
    const pool = await getPool();
    const accessScope = getAccessScope(req, { viewAll: 'FEEDBACK_VIEW_ALL', viewOwn: 'FEEDBACK_VIEW_OWN' });
    if (accessScope === 'none') {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem phản ánh' });
    }
    const request = pool.request().input('FeedbackID', sql.Int, req.params.id);
    let ownership = '';
    if (accessScope === 'own') {
      ownership = ' AND r.UserID = @UserID';
      request.input('UserID', sql.Int, req.userId);
    }
    const result = await request.query(`
      SELECT f.FeedbackID, f.Title, f.Content, f.Rating, f.Reply, f.CreatedDate,
             r.ResidentID, r.FullName AS ResidentName
      FROM Feedback f
      JOIN Resident r ON r.ResidentID = f.ResidentID
      WHERE f.FeedbackID = @FeedbackID${ownership}
    `);
    if (!result.recordset[0]) return res.status(404).json({ success: false, message: 'Feedback not found' });
    return res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Get feedback error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch feedback' });
  }
};

exports.updateFeedbackReply = async (req, res) => {
  try {
    if (getAccessScope(req, { viewAll: 'FEEDBACK_VIEW_ALL', viewOwn: 'FEEDBACK_VIEW_OWN' }) !== 'all') {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Cư dân không có quyền phản hồi phản ánh' });
    }
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Reply content is required'
      });
    }

    const pool = await getPool();
    const result = await pool.request()
      .input('FeedbackID', sql.Int, id)
      .input('Reply', sql.NVarChar, reply)
      .query(`
        UPDATE Feedback
        SET Reply = @Reply
        WHERE FeedbackID = @FeedbackID
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: 'Reply updated successfully',
      data: { FeedbackID: parseInt(id, 10), Reply: reply }
    });
  } catch (error) {
    console.error('Update feedback reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feedback reply',
      error: error.message
    });
  }
};
