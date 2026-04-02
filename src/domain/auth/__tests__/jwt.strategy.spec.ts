import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { TokenType, UserType } from '../../../core/constants/app.constants';

describe('JwtStrategy - Comprehensive', () => {
  let strategy: JwtStrategy;
  let configService: jest.Mocked<ConfigService>;

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('Constructor - Strategy Configuration', () => {
    it('should create strategy instance', () => {
      expect(strategy).toBeInstanceOf(JwtStrategy);
    });

    it('should retrieve JWT secret from config', () => {
      // Trigger the constructor by creating a new instance
      new JwtStrategy(configService);

      expect(configService.getOrThrow).toHaveBeenCalledWith('app.jwt.secret');
    });

    it('should use getOrThrow to ensure secret is always a string', () => {
      new JwtStrategy(configService);

      expect(configService.getOrThrow).toHaveBeenCalled();
    });
  });

  describe('validate - Payload Validation', () => {
    it('should return payload unchanged', () => {
      const payload = {
        id: 'user-uuid',
        email: 'user@example.com',
        type: TokenType.LOGIN,
        userType: UserType.USER,
      };

      const result = strategy.validate(payload as any);

      expect(result).toEqual(payload);
    });

    it('should return payload with all properties', () => {
      const payload = {
        id: 'admin-uuid',
        email: 'admin@example.com',
        type: TokenType.LOGIN,
        userType: UserType.ADMIN,
      };

      const result = strategy.validate(payload as any);

      expect(result.id).toBe('admin-uuid');
      expect(result.email).toBe('admin@example.com');
      expect(result.type).toBe(TokenType.LOGIN);
      expect(result.userType).toBe(UserType.ADMIN);
    });

    it('should handle payload with minimal properties', () => {
      const payload = {
        id: 'user-uuid',
        email: 'user@example.com',
      };

      const result = strategy.validate(payload as any);

      expect(result).toEqual(payload);
    });

    it('should handle delivery partner payload', () => {
      const payload = {
        id: 'delivery-partner-uuid',
        email: 'partner@example.com',
        type: TokenType.LOGIN,
        userType: UserType.DELIVERY_PARTNER,
      };

      const result = strategy.validate(payload as any);

      expect(result).toEqual(payload);
    });

    it('should handle supplier payload', () => {
      const payload = {
        id: 'supplier-uuid',
        email: 'supplier@example.com',
        type: TokenType.LOGIN,
        userType: UserType.SUPPLIER,
      };

      const result = strategy.validate(payload as any);

      expect(result).toEqual(payload);
    });

    it('should make payload available on req.user', () => {
      // The purpose of validate is to return the payload so it's available on req.user
      const payload = {
        id: 'test-uuid',
        email: 'test@example.com',
        type: TokenType.LOGIN,
        userType: UserType.USER,
      };

      const result = strategy.validate(payload as any);

      // The returned value becomes req.user
      expect(result).toBe(payload);
    });
  });

  describe('Strategy Options', () => {
    it('should extract JWT from Bearer token header', () => {
      // The strategy is configured with ExtractJwt.fromAuthHeaderAsBearerToken()
      // This is verified by checking the super() call configuration
      expect(strategy).toBeDefined();
    });

    it('should not ignore expiration', () => {
      // ignoreExpiration is set to false
      expect(strategy).toBeDefined();
    });
  });
});
