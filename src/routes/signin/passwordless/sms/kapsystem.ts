import axios from 'axios';

export async function sendOTP(phone: string, code: string): Promise<any> {
  const opts = {
    username: process.env.AUTH_SMS_KAPSYSTEM_USERNAME,
    pass: process.env.AUTH_SMS_KAPSYSTEM_PASSWORD,
    senderid: process.env.AUTH_SMS_KAPSYSTEM_SENDERID,
    dest_mobileno: phone?.replace('+91', ''),
    dltentityid: process.env.AUTH_SMS_KAPSYSTEM_ENTITYID,
    dltheaderid: process.env.AUTH_SMS_KAPSYSTEM_HEADERID,
    tmid: process.env.AUTH_SMS_KAPSYSTEM_TMID,
    dlttempid: process.env.AUTH_SMS_KAPSYSTEM_TEMPLATEID,
    response: 'Y',
  };

  // const message = `Here%20is%20your%20OTP%20to%20access%20MyCENTA%20(CENTA%27s%20online%20platform%20for%20teachers):%20${code}%20`;
  const message = `${code}%20is%20your%20OTP%20to%20access%20the%20CENTA%20APP/%20register%20for%20CENTA's%20International%20TPO/%20assessments/%20learning%20products.%20hHA4DwnSYbu`;

  // const params = new URLSearchParams(options);

  const url = `http://www.smsjust.com/blank/sms/user/urlsms.php?username=${opts.username}&pass=${opts.pass}&senderid=${opts.senderid}&dest_mobileno=${opts.dest_mobileno}&message=${message}&dltentityid=${opts.dltentityid}&dltheaderid=${opts.dltheaderid}&tmid=${opts.tmid}&dlttempid=#${opts.dlttempid}&response=Y`;

  try {
    const res = await axios.post(url);
    console.log(res.data, 'data');
    return {
      message: 'success',
      response: res?.data,
      status: res?.status,
      statusText: res?.statusText,
    };
  } catch (err) {
    // return 0
    console.log(err, 'error');
    return {
      message: 'failed',
      response: err,
    };
  }
}
