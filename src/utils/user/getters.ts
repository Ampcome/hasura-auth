import { User } from '@/types';
// import { gqlSdk } from '../gql-sdk';
import database from '../database';

export const getUserByPhoneNumber = async ({
  phoneNumber,
}: {
  phoneNumber: string;
}) => {
  let user : any;
  const _res = await database.query(`select u.id, u."email", u.disabled, u.phone_number as "phoneNumber", u.display_name as "displayName", u.avatar_url as "avatarUrl",
	u.password_hash as "passwordHash", u.email_verified as "emailVerified", u.locale , u.phone_number_verified as "phoneNumberVerified",
	u.default_role as "defaultRole", u.is_anonymous as "isAnonymous", u.otp_hash as "otpHash", u.totp_secret as "totpSecret",
	u.active_mfa_type as "activeMfaType", u.new_email as "newEmail", u.metadata, u.created_at as "createdAt",
	(select array_agg(json_build_object('role', role)) from auth.user_roles ur where ur.user_id = u.id) as roles from auth.users u
where u.phone_number = '${phoneNumber}'`)
  if (_res.rowCount == 1) {
    user = _res.rows[0];
  }
  return user;
};

export const getUser = async ({
  userId,
}: {
  userId: string;
}): Promise<User> => {
  let user : any;
  const _res = await database.query(`select u.id, u."email", u.disabled, u.phone_number as "phoneNumber", u.display_name as "displayName", u.avatar_url as "avatarUrl",
	u.password_hash as "passwordHash", u.email_verified as "emailVerified", u.locale , u.phone_number_verified as "phoneNumberVerified",
	u.default_role as "defaultRole", u.is_anonymous as "isAnonymous", u.otp_hash as "otpHash", u.totp_secret as "totpSecret",
	u.active_mfa_type as "activeMfaType", u.new_email as "newEmail", u.metadata, u.created_at as "createdAt",
	(select array_agg(json_build_object('role', role)) from auth.user_roles ur where ur.user_id = u.id) as roles from auth.users u
where u.id = '${userId}'`)
  if (_res.rowCount == 1) {
    user = _res.rows[0];
  }

  if (!user) {
    throw new Error('Unable to get user');
  }

  const {
    id,
    createdAt,
    displayName,
    avatarUrl,
    locale,
    email,
    isAnonymous,
    defaultRole,
    metadata,
    emailVerified,
    phoneNumber,
    phoneNumberVerified,
    activeMfaType,
    roles
  } = user;
  return {
    id,
    createdAt,
    displayName,
    avatarUrl,
    locale,
    email,
    isAnonymous,
    defaultRole,
    metadata,
    emailVerified,
    phoneNumber,
    phoneNumberVerified,
    activeMfaType,
    roles: roles.map((role: {role:string}) => role.role),
  };
};

export const getUserByEmail = async (email: string) => {
  let user : any;
  const _res = await database.query(`select u.id, u."email", u.disabled, u.phone_number as "phoneNumber", u.display_name as "displayName", u.avatar_url as "avatarUrl",
	u.password_hash as "passwordHash", u.email_verified as "emailVerified", u.locale , u.phone_number_verified as "phoneNumberVerified",
	u.default_role as "defaultRole", u.is_anonymous as "isAnonymous", u.otp_hash as "otpHash", u.totp_secret as "totpSecret",
	u.active_mfa_type as "activeMfaType", u.new_email as "newEmail", u.metadata, u.created_at as "createdAt",
	(select array_agg(json_build_object('role', role)) from auth.user_roles ur where ur.user_id = u.id) as roles from auth.users u
where u.email = '${email}'`)
  if (_res.rowCount == 1) {
    user = _res.rows[0];
  }
  return user;
};

export const getUserByTicket = async (ticket: string) => {

  let user : any;
  const _res = await database.query(`select u.id, u."email", u.disabled, u.phone_number as "phoneNumber", u.display_name as "displayName", u.avatar_url as "avatarUrl",
	u.password_hash as "passwordHash", u.email_verified as "emailVerified", u.locale , u.phone_number_verified as "phoneNumberVerified",
	u.default_role as "defaultRole", u.is_anonymous as "isAnonymous", u.otp_hash as "otpHash", u.totp_secret as "totpSecret",
	u.active_mfa_type as "activeMfaType", u.new_email as "newEmail", u.metadata, u.created_at as "createdAt",
	(select array_agg(json_build_object('role', role)) from auth.user_roles ur where ur.user_id = u.id) as roles from auth.users u
where u.ticket = '${ticket}' and u.ticket_expires_at > NOW()`)
  if (_res.rowCount == 1) {
    user = _res.rows[0];
  }
  return user;

};
