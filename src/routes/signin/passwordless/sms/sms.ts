import { RequestHandler } from 'express';
import twilio from 'twilio';
import { ReasonPhrases } from 'http-status-codes';

import { UserRegistrationOptions } from '@/types';
import {
  gqlSdk,
  getNewOneTimePasswordData,
  getUserByPhoneNumber,
  insertUser,
  ENV,
  getHmacTokens,
  updateHmacTokens,
} from '@/utils';
import { sendError } from '@/errors';
import { Joi, phoneNumber, registrationOptions } from '@/validation';
import { isTestingPhoneNumber, isVerifySid } from '@/utils/twilio';
import { logger } from '@/logger';
import { renderTemplate } from '@/templates';
import { sendOTP } from './kapsystem';
import { signInOtplessHandler } from '../../otpless';
import jwt from "jsonwebtoken"

export type PasswordLessSmsRequestBody = {
  phoneNumber: string;
  options: UserRegistrationOptions;
};

export const signInPasswordlessSmsSchema =
  Joi.object<PasswordLessSmsRequestBody>({
    phoneNumber,
    options: registrationOptions,
  }).meta({ className: 'SignInPasswordlessSmsSchema' });

export const signInPasswordlessSmsHandler: RequestHandler<
  {},
  {},
  PasswordLessSmsRequestBody
> = async (req, res) => {
  if (!ENV.AUTH_SMS_PASSWORDLESS_ENABLED) {
    return sendError(res, 'disabled-endpoint');
  }

  const {
    phoneNumber,
    options: { defaultRole, allowedRoles, displayName, locale, metadata },
  } = req.body;
  // logger.info('Metadata', metadata);
  // TODO: handling token management
  const passwordless_token:any = metadata?.token ?? ''
  console.log("passwordless_token",passwordless_token)
  if(!passwordless_token) {
    return sendError(res,'passwordless-token-missing')
  }
  if(!ENV.HASURA_GRAPHQL_JWT_SECRET) {
    return sendError(res,'invalid-webauthn-security-key')
  }
  const token_response = await getHmacTokens(passwordless_token)
  if(!token_response?.is_exist) {
    return sendError(res,'forbidden-anonymous')
  }
  if(token_response?.is_used) {
    return sendError(res,'passwordless-token-used')
  }
  // decode the token
  const decode:any = jwt.verify(passwordless_token,ENV.HASURA_GRAPHQL_JWT_SECRET.key)
  const nonce = decode?.nonce
  if(token_response?.nonce !== nonce) {
    return sendError(res,'passwordless-verification-failed')
  }
  console.log("token_response",token_response)
  // end

  if(metadata?.src === "otpless") {
    // logger.info(`OTPless Source ${metadata?.src}`);
    // logger.info(`OPTless Token ${metadata?.token}`);
    const otplessResponse = await signInOtplessHandler(phoneNumber, { defaultRole, allowedRoles, displayName, locale, metadata });
    // logger.info(`OTPless Response: ${JSON.stringify(otplessResponse)}`);
    if(otplessResponse?.error) {
      return sendError(res, otplessResponse.error);
    }
    // handle passwordless token used
    await updateHmacTokens(token_response?.nonce)
    console.log("token update success")
    // return res.json(otplessResponse);
    return res.json(ReasonPhrases.OK);
  }

  // check if email already exist
  let user = await getUserByPhoneNumber({ phoneNumber });
  const userExists = !!user;

  // if no user exists, create the user
  if (!userExists) {
    user = await insertUser({
      disabled: ENV.AUTH_DISABLE_NEW_USERS,
      displayName,
      avatarUrl: '',
      phoneNumber,
      locale,
      defaultRole,
      roles: {
        // restructure user roles to be inserted in GraphQL mutation
        data: allowedRoles.map((role: string) => ({ role })),
      },
      metadata,
    });
  }

  if (user.disabled) {
    return sendError(res, 'disabled-user');
  }

  // set otp for user that will be sent in the email
  const { otp, otpHash, otpHashExpiresAt } = await getNewOneTimePasswordData();
  console.log(otp, 'otp');
  await gqlSdk.updateUser({
    id: user.id,
    user: {
      otpMethodLastUsed: 'sms',
      otpHash,
      otpHashExpiresAt,
    },
  });

  if (isTestingPhoneNumber(user.phoneNumber)) {
    const message = `Here is your OTP to acccess MYCENTA - ${otp}`;

    logger.info(`Message to ${user.phoneNumber}: ${message}`);
    return res.json(ReasonPhrases.OK);
  }

  if (!ENV.AUTH_SMS_PROVIDER) {
    throw Error('No sms provider set');
  } else if (ENV.AUTH_SMS_PROVIDER === 'kapsystem') {
    try {
      // const message = `Here is your OTP to acccess MYCENTA - ${otp}`;
      const kres = await sendOTP(phoneNumber, otp);
      console.log('kap res', JSON.stringify(kres));
      // handle passwordless token used
      await updateHmacTokens(token_response?.nonce)
    console.log("token update success")
    } catch (error: any) {
      logger.error('Error sending sms');
      logger.error(error);

      // delete user that was inserted because we were not able to send the SMS
      if (!userExists) {
        await gqlSdk.deleteUser({
          userId: user.id,
        });
      }
      return sendError(res, 'cannot-send-sms');
    }
  } else {
    const twilioClient = twilio(
      ENV.AUTH_SMS_TWILIO_ACCOUNT_SID,
      ENV.AUTH_SMS_TWILIO_AUTH_TOKEN
    );

    try {
      const messagingServiceSid = ENV.AUTH_SMS_TWILIO_MESSAGING_SERVICE_ID;

      if (isVerifySid(messagingServiceSid)) {
        await twilioClient.verify
          .services(messagingServiceSid)
          .verifications.create({
            channel: 'sms',
            to: phoneNumber,
          });
      } else {
        const template = 'signin-passwordless-sms';
        const message = await renderTemplate(`${template}/text`, {
          locale: user.locale ?? ENV.AUTH_LOCALE_DEFAULT,
          displayName: user.displayName,
          code: otp,
        });

        await twilioClient.messages.create({
          body: message ?? `Your code is ${otp}`,
          from: ENV.AUTH_SMS_TWILIO_MESSAGING_SERVICE_ID,
          to: phoneNumber,
        });
      }
    } catch (error: any) {
      logger.error('Error sending sms');
      logger.error(error);

      // delete user that was inserted because we were not able to send the SMS
      if (!userExists) {
        await gqlSdk.deleteUser({
          userId: user.id,
        });
      }
      return sendError(res, 'cannot-send-sms');
    }
  }

  return res.json(ReasonPhrases.OK);
};
