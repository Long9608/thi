const bcrypt = require('bcrypt');
const crypto = require('crypto');

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$/;

function getSaltRounds() {
    const configured = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);

    if (Number.isInteger(configured) && configured >= 8 && configured <= 15) {
        return configured;
    }

    return 12;
}

function isBcryptHash(value) {
    return typeof value === 'string' && BCRYPT_HASH_PATTERN.test(value);
}

async function hashPassword(password) {
    return bcrypt.hash(String(password), getSaltRounds());
}

function safeLegacyCompare(password, storedPassword) {
    const plainBuffer = Buffer.from(String(password));
    const storedBuffer = Buffer.from(String(storedPassword ?? ''));

    if (plainBuffer.length !== storedBuffer.length) {
        return false;
    }

    return crypto.timingSafeEqual(plainBuffer, storedBuffer);
}

async function verifyPassword(password, storedPassword) {
    if (!storedPassword) {
        return { valid: false, needsUpgrade: false };
    }

    if (isBcryptHash(storedPassword)) {
        return {
            valid: await bcrypt.compare(String(password), storedPassword),
            needsUpgrade: false
        };
    }

    const valid = safeLegacyCompare(password, storedPassword);

    return {
        valid,
        needsUpgrade: valid
    };
}

async function hashPasswordBody(req, res, next) {
    try {
        const password = req.body?.password;

        if (!password) {
            return next();
        }

        if (String(password).length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters'
            });
        }

        req.body.password = await hashPassword(password);
        return next();
    } catch (error) {
        return next(error);
    }
}

module.exports = {
    getSaltRounds,
    isBcryptHash,
    hashPassword,
    verifyPassword,
    hashPasswordBody
};
