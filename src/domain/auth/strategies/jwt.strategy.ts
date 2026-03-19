import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ITokenPayload } from 'src/core/constants/interfaces/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Use getOrThrow to ensure the secret is always a string
      secretOrKey: configService.getOrThrow<string>('app.jwt.secret'),
    });
  }

  validate(payload: ITokenPayload): ITokenPayload {
    // This payload contains the 'id' and 'email' you signed in auth.service.ts
    // Return it so it's available in req.user
    return payload;
  }
}
