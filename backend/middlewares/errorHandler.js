const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // SQL Server errors
    if (err.number) {
        return res.status(400).json({
            success: false,
            message: 'Database error',
            error: err.message
        });
    }
    
    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
    
    // Default error
    return res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
};

module.exports = errorHandler;