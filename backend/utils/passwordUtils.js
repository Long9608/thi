const bcrypt = require('bcrypt');

const SALT_ROUNDS =
    parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;

const isBcryptHash = (value) => {
    return typeof value === 'string'
        && /^\$2[aby]\$\d{2}\$/.test(value);
};

const hashPassword = async (password) => {
    if (!password || typeof password !== 'string') {
        throw new Error('Password is required');
    }

    return bcrypt.hash(password, SALT_ROUNDS);
};

const verifyPassword = async (plainPassword, storedPassword) => {
    if (!plainPassword || !storedPassword) {
        return {
            valid: false,
            needsUpgrade: false
        };
    }

    // Password đã được bcrypt hash
    if (isBcryptHash(storedPassword)) {
        return {
            valid: await bcrypt.compare(
                plainPassword,
                storedPassword
            ),
            needsUpgrade: false
        };
    }

    // Hỗ trợ dữ liệu cũ đang lưu plaintext.
    // Nếu đăng nhập đúng thì yêu cầu upgrade sang bcrypt.
    const valid = plainPassword === storedPassword;

    return {
        valid,
        needsUpgrade: valid
    };
};

module.exports = {
    hashPassword,
    verifyPassword,
    isBcryptHash
};