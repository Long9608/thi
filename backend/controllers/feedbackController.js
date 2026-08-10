const { getPool, sql } = require('../config/db');

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

exports.updateFeedbackReply = async (req, res) => {
  try {
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
