import { Session, SignInResponse, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { UserFieldsFragment } from './__generated__/graphql-request';
import { ENV } from './env';
import { gqlSdk } from './gql-sdk';
import { createHasuraAccessToken } from './jwt';
import { getNewRefreshToken, updateRefreshTokenExpiry } from './refresh-token';
import { generateTicketExpiresAt } from './ticket';
import { getUser } from './user';
import database from './database';

/**
 * Get new or update current user session
 *
 * @param userAndToken - User field fragment and current refresh token if any
 * @returns Returns new user session if no valid current refresh token is passed, otherwise update current session
 */
export const getNewOrUpdateCurrentSession = async ({
  user,
  currentRefreshToken,
}: {
  user: UserFieldsFragment;
  currentRefreshToken?: string;
}): Promise<Session> => {
  // update user's last seen

  database.query(`update auth.users set last_seen = NOW() where id = '${user.id}'`).catch(exp => {
    console.error(exp)
  })
  // gqlSdk.updateUser({
  //   id: user.id,
  //   user: {
  //     lastSeen: new Date(),
  //   },
  // });
  // const sessionUser = await getUser({ userId: user.id });
  let u: User = { ...user } as unknown as User;
  u.roles = user.roles.map(r => r.role)
  const accessToken = await createHasuraAccessToken(user);
  const { refreshToken, id: refreshTokenId } =
    (currentRefreshToken &&
      (await updateRefreshTokenExpiry(currentRefreshToken))) ||
    (await getNewRefreshToken(user.id));
  return {
    accessToken,
    accessTokenExpiresIn: ENV.AUTH_ACCESS_TOKEN_EXPIRES_IN,
    refreshToken,
    refreshTokenId,
    user: u,
  };
};

export const getSignInResponse = async ({
  userId,
  user,
  checkMFA,
}: {
  userId: string;
  user?: any,
  checkMFA: boolean;
}): Promise<SignInResponse> => {
  if (!user) {
    user = await getUser({ userId, });
  }
  if (!user) {
    throw new Error('No user');
  }
  if (checkMFA && user?.activeMfaType === 'totp') {
    // generate new ticket
    const ticket = `mfaTotp:${uuidv4()}`;
    // set ticket
    await gqlSdk.updateUser({
      id: userId,
      user: {
        ticket,
        ticketExpiresAt: generateTicketExpiresAt(5 * 60),
      },
    });
    return {
      session: null,
      mfa: {
        ticket,
      },
    };
  }
  const session = await getNewOrUpdateCurrentSession({ user });
  return {
    session,
    mfa: null,
  };
};
