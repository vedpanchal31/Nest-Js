import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { EmailTemplateService } from './email-template.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.getOrThrow<string>('app.mail.host'),
          port: Number(config.getOrThrow<string>('app.mail.port')),
          secure: false,
          auth: {
            user: config.getOrThrow<string>('app.mail.user'),
            pass: config.getOrThrow<string>('app.mail.pass'),
          },
        },
        defaults: {
          from: `"No Reply" <${config.getOrThrow<string>('app.mail.from')}>`,
        },
      }),
    }),
  ],
  providers: [EmailTemplateService],
  exports: [MailerModule, EmailTemplateService],
})
export class MailerGlobalModule {}
