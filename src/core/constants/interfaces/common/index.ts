import { TokenType, UserType } from '../../app.constants';

export interface ITokenPayload {
  id: string;
  email: string;
  type: TokenType;
  userType: UserType;
  roleId?: string;
}
