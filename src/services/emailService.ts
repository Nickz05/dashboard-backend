import nodemailer from 'nodemailer';

// Hulpfunctie om de HTML-inhoud te genereren
const generateResetPasswordHtml = (userName: string, resetUrl: string): string => {
    const currentYear = new Date().getFullYear();
    const primaryColor = '#FFA500'; // Helder Oranje/Geel (Actie/Zon)
    const secondaryColor = '#002B4B'; // Donkerblauw (Headers, Links, Merk)
    const buttonTextColor = '#000000'; // Zwarte tekst op oranje knop voor contrast
    const mainTextColor = '#333333'; // Zacht donkergrijs voor body tekst
    const bgColor = '#F9FAFB'; // Zeer lichtgrijze/witte achtergrond
    const cardBgColor = '#FFFFFF'; // Witte kaart achtergrond
    const warningBg = '#FFFBF2'; // Zeer lichtgele waarschuwing achtergrond
    const warningBorder = '#D97706'; // Donkerdere Oranje/Amber waarschuwing rand

    return `
        <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
        <html xmlns="http://www.w3.org/1999/xhtml">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <title>Zomer Development - Wachtwoord Herstellen</title>
            <!--  -->
            <style type="text/css">
                /* GLOBALE STIJLEN (Inline CSS is essentieel voor e-mail clients) */
                body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
                table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
                img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
                a { color: ${secondaryColor}; text-decoration: none; }
                
                /* MEDIA QUERIES voor Mobiel */
                @media only screen and (max-width: 600px) {
                    .email-container { width: 100% !important; }
                    .content-padding { padding: 25px !important; }
                    .logo-img { max-width: 70% !important; height: auto !important; }
                }
            </style>
        </head>
        <body style="margin: 0; padding: 0; background-color: ${bgColor};" bgcolor="${bgColor}">
            <!-- 1. CONTAINER: Centered Table (Grootste schaduw voor premium uitstraling) -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${bgColor}" style="background-color: ${bgColor};">
                <tr>
                    <td align="center" style="padding: 40px 0;">
                        
                        <table border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; background-color: ${cardBgColor}; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e0e0e0;">
                            
                            <!-- 2. HEADER/LOGO SECTIE (Meer witruimte rondom logo) -->
                            <tr>
                                <td align="center" style="background-color: ${cardBgColor}; padding: 30px 20px 20px 20px;">
                                    <!-- ✅ Logo van Zomer Development - BELANGRIJK: VERVANG PLAATS HIER DE URL -->
                                    <img src="https://dashboard.nickzomer.com/assets/logo_volledig-DyEaV9Ev.png" 
                                         alt="Zomer Development Logo" 
                                         width="200" 
                                         style="display: block; border: 0; max-width: 200px;" 
                                         class="logo-img" />
                                </td>
                            </tr>

                            <!-- 3. HOOFDCONTENT SECTIE -->
                            <tr>
                                <td align="left" style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: ${mainTextColor}; padding: 0 40px 40px 40px;" class="content-padding">
                                    
                                    <!-- Titel met oranje accent streep -->
                                    <h1 style="color: ${secondaryColor}; font-size: 28px; margin: 0 0 25px 0; font-weight: 700; border-bottom: 3px solid ${primaryColor}; padding-bottom: 10px;">
                                        Wachtwoord Herstellen
                                    </h1>
                                    
                                    <p style="margin: 0 0 15px 0;">Hallo ${userName},</p>
                                    <p style="margin: 0 0 30px 0;">Je hebt zojuist een aanvraag ingediend om je wachtwoord te resetten. Klik op de onderstaande, "Nieuw wachtwoord instellen" knop om direct een nieuw en veilig wachtwoord in te stellen:</p>

                                    <!-- KNOP SECTIE - Subtiele 3D diepte -->
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                        <tr>
                                            <td align="center" style="padding: 15px 0 40px 0;">
                                                <table border="0" cellpadding="0" cellspacing="0">
                                                    <tr>
                                                        <td align="center" style="border-radius: 8px;" bgcolor="${primaryColor}">
                                                            <a href="${resetUrl}" target="_blank" style="
                                                                background-color: ${primaryColor};
                                                                color: ${buttonTextColor} !important;
                                                                text-decoration: none;
                                                                padding: 15px 35px;
                                                                border-radius: 8px;
                                                                font-weight: bold;
                                                                font-size: 18px;
                                                                display: inline-block;
                                                                mso-padding-alt: 15px 35px; /* Outlook padding fix */
                                                                /* Subtiele schaduw/diepte door border-bottom */
                                                                border-bottom: 4px solid ${secondaryColor};
                                                                border-right: 1px solid ${secondaryColor};
                                                                border-left: 1px solid ${secondaryColor};
                                                                border-top: 1px solid ${primaryColor};
                                                            ">
                                                                Nieuw Wachtwoord Instellen
                                                            </a>
                                                        </td>
                                                    </tr>
                                                </table>
                                            </td>
                                        </tr>
                                    </table>
                                    
                                    <!-- VEILIGHEID / ANTI-SCAM SECTIE (Strak en Professioneel) -->
                                    <div style="background-color: ${warningBg}; padding: 18px; border-left: 5px solid ${warningBorder}; margin: 20px 0 20px 0; font-size: 14px; border-radius: 4px; color: ${mainTextColor};">
                                        <p style="margin: 0 0 8px 0; font-weight: bold; color: ${secondaryColor};">BELANGRIJKE VEILIGHEIDSINSTRUCTIES:</p>
                                        <ul style="margin: 0; padding-left: 20px;">
                                            <li style="margin-bottom: 5px;">Deze reset-link is **slechts 60 minuten geldig**.</li>
                                            <li>**Heeft u dit niet aangevraagd?** U kunt deze e-mail direct verwijderen. Uw wachtwoord is veilig en er is geen actie vereist.</li>
                                        </ul>
                                    </div>
                                    
                                    <!-- LINK DETAILS (voor het geval de knop faalt) -->
                                    <p style="margin: 25px 0 5px 0; font-size: 14px; color: #666;">Kopieer en plak deze link in uw browser als de knop niet werkt:</p>
                                    <div style="word-break: break-all; color: ${secondaryColor}; font-size: 13px; background-color: #f0f0f0; padding: 10px; border-radius: 4px; border: 1px solid #dddddd;">
                                        ${resetUrl}
                                    </div>
                                    
                                    <p style="margin: 30px 0 0 0;">Met vriendelijke groet,</p>
                                    <p style="margin: 0; font-weight: bold; color: ${secondaryColor};">Het Zomer Development Team</p>
                                </td>
                            </tr>

                            <!-- 4. FOOTER SECTIE (Zachte randen) -->
                            <tr>
                                <td align="center" style="padding: 25px 40px; text-align: center; color: #6b7280; font-family: Arial, sans-serif; font-size: 12px; border-top: 1px solid #e0e0e0; background-color: #f7f7f7; border-radius: 0 0 12px 12px;">
                                    <p style="margin: 0 0 5px 0;"><a href="https://zomerdev.com" style="color: ${secondaryColor}; text-decoration: underline;">Zomerdev.com</a></p>
                                    <p style="margin: 0 0 5px 0;">&copy; ${currentYear} Zomer Development. Alle rechten voorbehouden.</p>
                                    <p style="margin: 0;">Deze e-mail is automatisch gegenereerd. Reageer hier niet op.</p>
                                </td>
                            </tr>

                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
    `;
};


// ✅ Configureer email transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// ✅ Verstuur password reset email
export const sendPasswordResetEmail = async (
    to: string,
    userName: string,
    resetUrl: string
) => {
    // We gebruiken nu een vaste naam "Zomer Development" in de template,
    // maar we behouden de APP_NAME variabele voor de afzender.
    const appName = process.env.APP_NAME || 'Zomer Development';

    // De functie generateResetPasswordHtml is vereenvoudigd en heeft de appName niet meer nodig.
    const htmlContent = generateResetPasswordHtml(userName, resetUrl);

    const mailOptions = {
        from: `"${appName}" <${process.env.SMTP_EMAIL}>`,
        to: to,
        subject: 'Wachtwoord Reset Aanvraag (60 minuten geldig)',
        html: htmlContent,
        text: `
Hallo ${userName},

Je hebt een verzoek ingediend om je wachtwoord te resetten.

Gebruik de volgende link om een nieuw wachtwoord in te stellen:
${resetUrl}

Deze link is 60 minuten geldig. Als je dit niet hebt aangevraagd, is er geen actie nodig.

Met vriendelijke groet,
Het Zomer Development Team
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${to}`);
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send password reset email');
    }
};

// ✅ Test email configuratie
export const testEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email server is ready to send messages');
        return true;
    } catch (error) {
        console.error('❌ Email server connection failed:', error);
        return false;
    }
};