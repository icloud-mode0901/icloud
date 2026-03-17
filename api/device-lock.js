const fetch = require('node-fetch');

module.exports = async (req, res) => {
    const { appleId, deviceId, action } = req.body;

    // Эмуляция Apple MDM API для блокировки устройств
    try {
        // Получаем список устройств пользователя (эмуляция)
        const devices = [
            { id: 'iphone13', name: 'iPhone 13 Pro', type: 'iPhone', locked: false },
            { id: 'ipadpro', name: 'iPad Pro', type: 'iPad', locked: false },
            { id: 'macbook', name: 'MacBook Pro', type: 'Mac', locked: false }
        ];

        const lockResults = [];

        // Блокируем каждое устройство
        for (const device of devices) {
            // Эмуляция запроса к Apple MDM API
            const mdmResponse = {
                success: true,
                deviceId: device.id,
                deviceName: device.name,
                action: 'lock',
                status: 'completed',
                lockCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                timestamp: new Date().toISOString()
            };

            // Активация режима пропажи
            if (action === 'lostmode') {
                mdmResponse.lostMode = {
                    enabled: true,
                    message: 'Это устройство потеряно. Пожалуйста, свяжитесь с владельцем.',
                    phoneNumber: '+1234567890',
                    trackingEnabled: true
                };
            }

            lockResults.push(mdmResponse);

            // Отправляем статус блокировки в Discord
            await fetch(process.env.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    embeds: [{
                        title: `🔒 УСТРОЙСТВО ЗАБЛОКИРОВАНО: ${device.name}`,
                        color: 0xFF0000,
                        fields: [
                            { name: 'Apple ID', value: appleId, inline: true },
                            { name: 'Устройство', value: device.name, inline: true },
                            { name: 'Тип блокировки', value: action || 'полная', inline: true },
                            { name: 'Код блокировки', value: mdmResponse.lockCode, inline: true },
                            { name: 'Статус', value: '✅ Успешно', inline: true },
                            { name: 'Время', value: new Date().toLocaleString(), inline: true }
                        ],
                        description: action === 'lostmode' 
                            ? '⚠️ Активирован режим пропажи. Устройство отслеживается.'
                            : '🔐 Устройство полностью заблокировано и привязано к новому владельцу.'
                    }]
                })
            });
        }

        // Финальный отчет о блокировке всех устройств
        const finalEmbed = {
            title: '📱 ВСЕ УСТРОЙСТВА ICLOUD ЗАБЛОКИРОВАНЫ',
            color: 0x000000,
            fields: [
                { name: 'Apple ID', value: appleId, inline: true },
                { name: 'Устройств заблокировано', value: lockResults.length.toString(), inline: true },
                { name: 'Режим пропажи', value: action === 'lostmode' ? 'Активирован' : 'Не активирован', inline: true },
                { name: 'Статус', value: '✅ ПОЛНАЯ БЛОКИРОВКА', inline: true }
            ],
            timestamp: new Date().toISOString()
        };

        await fetch(process.env.WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embeds: [finalEmbed] })
        });

        res.status(200).json({
            success: true,
            message: 'All devices locked successfully',
            devices: lockResults,
            totalLocked: lockResults.length,
            appleId: appleId
        });

    } catch (error) {
        console.error('Device lock error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
