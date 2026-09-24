// Reject malformed pagination before it can reach SQL OFFSET/FETCH.
module.exports = (req, res, next) => {
    for (const key of ['page', 'limit', 'pageSize']) {
        const value = req.query[key];
        if (value === undefined) continue;
        if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 2147483647) {
            return res.status(400).json({success:false,message:`${key} phải là số nguyên dương hợp lệ.`});
        }
    }
    const offset = (Number(req.query.page || 1) - 1) * Math.max(Number(req.query.limit || 20), Number(req.query.pageSize || 20));
    if (offset > 2147483647) return res.status(400).json({success:false,message:'Trang yêu cầu vượt quá giới hạn phân trang.'});
    next();
};
