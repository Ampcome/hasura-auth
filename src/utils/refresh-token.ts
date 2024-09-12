import { gqlSdk } from '@/utils';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { ENV } from './env';
import database from './database';

/** Hash using SHA256, and prefix with \x so it matches the Postgres hexadecimal syntax */
export const hash = (value: string) =>
  `\\x${crypto.createHash('sha256').update(value).digest('hex')}`;

export const getUserByPAT = async (pat: string) => {
  const result = await gqlSdk.getUsersByPAT({ patHash: hash(pat) });
  return result.authRefreshTokens[0]?.user;
};

export const getUserByRefreshToken = async (refreshToken: string) => {
  const result = await database.query(`select rt.id as rid, u.id, u."email", u.disabled, u.phone_number as "phoneNumber", u.display_name as "displayName", u.avatar_url as "avatarUrl",
	u.password_hash as "passwordHash", u.email_verified as "emailVerified", u.locale , u.phone_number_verified as "phoneNumberVerified",
	u.default_role as "defaultRole", u.is_anonymous as "isAnonymous", u.otp_hash as "otpHash", u.totp_secret as "totpSecret",
	u.active_mfa_type as "activeMfaType", u.new_email as "newEmail", u.metadata, u.created_at as "createdAt",
	(select array_agg(json_build_object('role', role)) from auth.user_roles ur where ur.user_id = u.id) as roles  from auth.refresh_tokens rt 
left join auth.users u on u.id  = rt.user_id 
where rt.refresh_token_hash  = '${hash(refreshToken)}' -- and rt.expires_at > now()
and u.disabled = false;`)

  let u = result.rows[0];
  delete u?.rid;
  return u;
};

export const deleteUserRefreshTokens = async (userId: string) => {
  await gqlSdk.deleteUserRefreshTokens({ userId });
};

export const deleteRefreshToken = async (refreshToken: string) => {
  // * delete both refresh token and its hash value
  await gqlSdk.deleteRefreshToken({
    refreshTokenHash: hash(refreshToken),
  });
};

const newRefreshExpiry = () => {
  const date = new Date();

  // cant return this becuase this will return a unix timestamp directly
  date.setSeconds(date.getSeconds() + ENV.AUTH_REFRESH_TOKEN_EXPIRES_IN);

  // instead we must return the js date object
  return date;
};

export const updateRefreshTokenExpiry = async (refreshToken: string) => {
  const { updateAuthRefreshTokens } =
    await gqlSdk.getUsersByRefreshTokenAndUpdateRefreshTokenExpiresAt({
      refreshTokenHash: hash(refreshToken),
      expiresAt: new Date(newRefreshExpiry()),
    });

  return { refreshToken, id: updateAuthRefreshTokens?.returning[0]?.id };
};

export const getNewRefreshToken = async (
  userId: string,
  refreshToken = uuidv4()
) => {
  const { insertAuthRefreshToken } = await gqlSdk.insertRefreshToken({
    refreshToken: {
      userId,
      refreshTokenHash: hash(refreshToken),
      expiresAt: new Date(newRefreshExpiry()),
    },
  });

  return {
    id: insertAuthRefreshToken?.id,
    refreshToken,
  };
};
