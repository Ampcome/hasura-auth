// import { RequestHandler } from 'express';
import { ReasonPhrases } from 'http-status-codes';
import bcrypt from 'bcryptjs';
import { logger } from '@/logger';
import axios from 'axios';
// import { Joi } from '@/validation';
import { ENV, getOTPLessTokenHash,
  getSignInResponse,
  // getSignInResponse,
  getUserByPhoneNumber, gqlSdk, insertUser } from '@/utils';

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

  // DEPRECATED
  // const check_valid_token = await axios({
  //   method:"post",
  //   url:"https://user-auth.otpless.app/auth/v1/validate/token",
  //   headers:{
  //     "Content-Type": "application/json",
  //     "clientId":process.env.AUTH_OTPLESS_CLIENT_ID,
  //     "clientSecret":process.env.AUTH_OTPLESS_CLIENT_SECRET
  //   },
  //   data:{
  //     token:metadata?.token
  //   }
  // })
  // if(check_valid_token?.data?.status === "SUCCESS") {
  //   const phone_number = `+${check_valid_token?.data?.identities?.[0]?.identityValue}`;
  //   const display_name = check_valid_token?.data?.identities?.[0]?.name;
  //   if(!phone_number) {
  //     return { error: ReasonPhrases.BAD_REQUEST };
  //   }
  //   let user = await getUserByPhoneNumber({ phoneNumber:phone_number });
  //   const userExists = !!user;
  //   if(!userExists) {
  //     user = await insertUser({
  //       disabled: ENV.AUTH_DISABLE_NEW_USERS,
  //       displayName:display_name,
  //       avatarUrl: '',
  //       phoneNumber: phone_number,
  //       locale,
  //       defaultRole,
  //       roles: {
  //         data: allowedRoles.map((role: string) => ({ role })),
  //       },
  //       metadata
  //     })
  //   }
  //   if (user.disabled) {
  //     return { error: 'disabled-user' };
  //   }
  //   // handle user_providers details - TODO
  //   // update phone number verified true
  //   // await gqlSdk.updateUser({
  //   //   id: user.id,
  //   //   user: {
  //   //     phoneNumberVerified: true
  //   //   }
  //   // })
  //   // handling otpless hasing technique
  //   const { otpHash, otpHashExpiresAt } = await getOTPLessTokenHash(metadata?.token);
  //   await gqlSdk.updateUser({
  //     id: user.id,
  //     user: {
  //       otpMethodLastUsed: 'otpless',
  //       otpHash,
  //       otpHashExpiresAt,
  //     },
  //   });
  //   logger.info(`User ${user.id} verified from otpless`);
  //   // const signInResponse = await getSignInResponse({
  //   //   userId: user.id,
  //   //   user,
  //   //   checkMFA: true,
  //   // });
  //   // logger.info(`User signInResponse ${JSON.stringify(signInResponse)}`);
  //   return {status: 'success'};
  // } else {
  //   return { error: ReasonPhrases.BAD_REQUEST };
  // }

  // TODO: trigger magic link to whatsapp
  const trigger_magic_link:any = await axios({
    method:"post",
    url:"https://auth.otpless.app/auth/v1/initiate/otp",
    headers:{
      "Content-Type": "application/json",
      "clientId":process.env.AUTH_OTPLESS_CLIENT_ID,
      "clientSecret":process.env.AUTH_OTPLESS_CLIENT_SECRET
    },
    data:{
      "phoneNumber": phoneNumber,
      "expiry": 60,
      "otpLength":6,
      "channels": metadata?.channel,
    }
  })
  logger.info(`Trigger magic link: ${JSON.stringify(trigger_magic_link?.data?.requestId)}`);
  // TODO: handle nhost procedure
  if(trigger_magic_link?.data?.requestId) {
      if(!phoneNumber) {
      return { error: ReasonPhrases.BAD_REQUEST };
    }
    let user = await getUserByPhoneNumber({ phoneNumber });
    const userExists = !!user;
    if(!userExists) {
      user = await insertUser({
        disabled: ENV.AUTH_DISABLE_NEW_USERS,
        displayName: '',
        avatarUrl: '',
        phoneNumber: phoneNumber,
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
    // handling otpless hasing technique
    const { otpHash, otpHashExpiresAt } = await getOTPLessTokenHash(trigger_magic_link?.data?.requestId);
    await gqlSdk.updateUser({
      id: user.id,
      user: {
        otpMethodLastUsed: 'otpless',
        otpHash,
        otpHashExpiresAt,
        metadata: {
          ...metadata,
          otpless_request_id: trigger_magic_link?.data?.requestId
        }
      },
    });
    logger.info(`User ${user.id} verified from otpless`);
    return {status: 'success'};
  } else {
    return { error: ReasonPhrases.BAD_REQUEST }
  }
};

export async function verifyOTPLess(user_id:string,requestId:string,otp_hash:string,otp:string,user:any) {
  // TODO: verify otpless code
  const verify_otpless:any = await axios({
    method:"post",
    url:"https://auth.otpless.app/auth/v1/verify/otp",
    headers:{
      "Content-Type": "application/json",
      "clientId":process.env.AUTH_OTPLESS_CLIENT_ID,
      "clientSecret":process.env.AUTH_OTPLESS_CLIENT_SECRET
    },
    data:{
      "requestId": requestId,
      "otp": otp
    }
  })
  logger.info(`Verify otpless: ${JSON.stringify(verify_otpless?.data)}`);
    if(verify_otpless?.data?.isOTPVerified) {
      // TODO: compare the requestId with the otp_hash
      if(await bcrypt.compare(requestId, otp_hash)) {
        // async function verifyPhoneNumberAndSignIn() {
        // TODO: cleanup the metadata realted to otpless and keep other keys in metadata - refer script
        function cleanupMetadata(metadata: Record<string, any>): Record<string, any> {
  const notAllowedKeys = new Set(["src", "channel", "otpless_request_id"]);

  return Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !notAllowedKeys.has(key))
  );
}
          await gqlSdk.updateUser({
            id: user_id,
            user: {
              otpHash: null,
              phoneNumberVerified: true,
              metadata:cleanupMetadata(user?.metadata)
            },
          });

          const signInResponse = await getSignInResponse({
            userId: user_id,
            user,
            checkMFA: true,
          });
          logger.info(`OTPLESS Sign in response: ${JSON.stringify(signInResponse)}`);
          return {status:true,response:signInResponse};
        // }
        // return "sign in response"
      } else {
        return { status:false };
      }
  } else {
    return { status:false };
  }
}
