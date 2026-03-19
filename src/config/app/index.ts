export const appconfig = () => {
  return {
    app: {
      jwt: {
        secret: process.env.JWT_SECRET,
      },
      mail: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM,
      },
      redis: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
      },
    },
  };
};
