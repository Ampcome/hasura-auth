// import { RequestHandler } from 'express';
import { ReasonPhrases } from 'http-status-codes';
// import bcrypt from 'bcryptjs';
import { logger } from '@/logger';
import axios from 'axios';
// import { Joi } from '@/validation';
import { ENV, getSignInResponse, getUserByPhoneNumber, gqlSdk, insertUser } from '@/utils';

// token schema
// export const signInOtplessSchema = Joi.object({
//   token: Joi.string().required(),
//   options: Joi.object({
//     defaultRole: Joi.string().required(),
//     allowedRoles: Joi.array().required(),
//     locale: Joi.string().required(),
//     metadata: Joi.object().required(),
//   }).required(),
// }).meta({ className: 'SignInOtplessSchema' });

// export const signInOtplessHandler: RequestHandler<
//   {},
//   {},
//   {
//     token: string;
//     options: any
//   }
// > = async (req, res) => {
//   const { token, options: { defaultRole, allowedRoles, locale, metadata } } = req.body;
//   logger.debug(`Sign in with OTPless: ${token}`);

//   // TODO: implement
//   const check_valid_token = await axios({
//     method:"post",
//     url:"https://user-auth.otpless.app/auth/v1/validate/token",
//     headers:{
//       "Content-Type": "application/json",
//       "clientId":process.env.AUTH_OTPLESS_CLIENT_ID,
//       "clientSecret":process.env.AUTH_OTPLESS_CLIENT_SECRET
//     },
//     data:{
//       token
//     }
//   })
//   if(check_valid_token?.data?.status === "SUCCESS") {
//     const phone_number = `+${check_valid_token?.data?.identities?.[0]?.identityValue}`;
//     const display_name = check_valid_token?.data?.identities?.[0]?.name;
//     if(!phone_number) {
//       return res.json(ReasonPhrases.BAD_REQUEST);
//     }
//     let user = await getUserByPhoneNumber({ phoneNumber:phone_number });
//     const userExists = !!user;
//     if(!userExists) {
//       user = await insertUser({
//         disabled: ENV.AUTH_DISABLE_NEW_USERS,
//         displayName:display_name,
//         avatarUrl: '',
//         phoneNumber: phone_number,
//         locale,
//         defaultRole,
//         roles: {
//           data: allowedRoles.map((role: string) => ({ role })),
//         },
//         metadata
//       })
//     }
//     if (user.disabled) {
//       return { error: 'disabled-user' };
//     }
//     // handle user_providers details - TODO
//     // update phone number verified true
//     await gqlSdk.updateUser({
//       id: user.id,
//       user: {
//         phoneNumberVerified: true
//       }
//     })
//     const signInResponse = await getSignInResponse({
//       userId: user.id,
//       user,
//       checkMFA: true,
//     });
//     return res.send(signInResponse);
//   } else {
//     return res.json(ReasonPhrases.BAD_REQUEST);
//   }
// };

export async function signInOtplessHandler (phoneNumber:string, options:any): Promise<any> {
  const { defaultRole, allowedRoles, locale, metadata } = options;
  logger.debug(`Sign in with OTPless: ${metadata?.token}`);

  // TODO: implement
  const check_valid_token = await axios({
    method:"post",
    url:"https://user-auth.otpless.app/auth/v1/validate/token",
    headers:{
      "Content-Type": "application/json",
      "clientId":process.env.AUTH_OTPLESS_CLIENT_ID,
      "clientSecret":process.env.AUTH_OTPLESS_CLIENT_SECRET
    },
    data:{
      token:metadata?.token
    }
  })
  if(check_valid_token?.data?.status === "SUCCESS") {
    const phone_number = `+${check_valid_token?.data?.identities?.[0]?.identityValue}`;
    const display_name = check_valid_token?.data?.identities?.[0]?.name;
    if(!phone_number) {
      return { error: ReasonPhrases.BAD_REQUEST };
    }
    let user = await getUserByPhoneNumber({ phoneNumber:phone_number });
    const userExists = !!user;
    if(!userExists) {
      user = await insertUser({
        disabled: ENV.AUTH_DISABLE_NEW_USERS,
        displayName:display_name,
        avatarUrl: '',
        phoneNumber: phone_number,
        locale,
        defaultRole,
        roles: {
          data: allowedRoles.map((role: string) => ({ role })),
        },
        metadata
      })
    }
    if (user.disabled) {
      return { error: 'disabled-user' };
    }
    // handle user_providers details - TODO
    // update phone number verified true
    await gqlSdk.updateUser({
      id: user.id,
      user: {
        phoneNumberVerified: true
      }
    })
    // logger.info(`User ${user.id} verified from otpless`);
    const signInResponse = await getSignInResponse({
      userId: user.id,
      user,
      checkMFA: true,
    });
    // logger.info(`User signInResponse ${JSON.stringify(signInResponse)}`);
    return signInResponse;
  } else {
    return { error: ReasonPhrases.BAD_REQUEST };
  }
};