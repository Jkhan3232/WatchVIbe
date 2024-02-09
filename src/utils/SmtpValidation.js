import { asyncHandler } from "./AsyncHandaler.js";
import { ApiError } from "./ApiError.js";
import nodemailer from "nodemailer";
import Mailgen from "mailgen";

// Send the generated OTP to the user's email
export const transporter = nodemailer.createTransport({
  host: process.env.HOST_NAME,
  port: process.env.HOST_PORT,
  auth: {
    user: process.env.EMAIL, // generated ethereal user
    pass: process.env.PASSWORD, // generated ethereal password
  },
});

//OTP Genrate Function
export function otpGenerator() {
  return Math.floor(Math.random() * 9000) + 1000;
}

export const sendOTP = asyncHandler(async ({ email, otp, type }) => {
  // Ensure valid email address
  if (!email) {
    throw new ApiError(400, "Email is required.");
  }

  try {
    // Determine the subject and message based on the OTP type
    let subject, text;

    if (type === "login") {
      subject = "Login OTP";
      text = `Your OTP for login is ${otp}. This OTP is valid for 5 minutes.`;
    } else if (type === "forgetPassword") {
      subject = "Forget Password OTP";
      text = `Your OTP for resetting password is ${otp}. This OTP is valid for 5 minutes.`;
    } else {
      throw new ApiError(400, "Invalid OTP type");
    }

    // Create the common email options
    const emailOptions = {
      from: process.env.EMAIL, // Your email address
      to: email,
      subject,
      text,
    };

    // Send the OTP
    await transporter.sendMail(emailOptions);

    return {
      success: true,
      message: `${type} OTP sent successfully`,
    };
  } catch (error) {
    throw new ApiError(500, "Internal server error");
  }
});

/**
 *
 * @param {{email: string; subject: string; mailgenContent: Mailgen.Content; }} options
 */
export const sendEmail = async (options) => {
  // Initialize mailgen instance with default theme and brand configuration
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: "WatchVibe",
      link: "http://localhost:2000",
    },
  });

  // For more info on how mailgen content work visit https://github.com/eladnava/mailgen#readme
  // Generate the plaintext version of the e-mail (for clients that do not support HTML)
  const emailTextual = mailGenerator.generatePlaintext(options.mailgenContent);

  // Generate an HTML email with the provided contents
  const emailHtml = mailGenerator.generate(options.mailgenContent);

  // Create a nodemailer transporter instance which is responsible to send a mail
  const transporter = nodemailer.createTransport({
    host: process.env.HOST_NAME,
    port: process.env.HOST_PORT,
    auth: {
      user: process.env.EMAIL, // generated ethereal user
      pass: process.env.PASSWORD, // generated ethereal password
    },
  });

  const mail = {
    from: "gshankhan4545@gmail.com", // We can name this anything. The mail will go to your Mailtrap inbox
    to: options.email, // receiver's mail
    subject: options.subject, // mail subject
    text: emailTextual, // mailgen content textual variant
    html: emailHtml, // mailgen content html variant
  };

  try {
    await transporter.sendMail(mail);
  } catch (error) {
    // As sending email is not strongly coupled to the business logic it is not worth to raise an error when email sending fails
    // So it's better to fail silently rather than breaking the app
    console.log(
      "Email service failed silently. Make sure you have provided your MAILTRAP credentials in the .env file"
    );
    console.log("Error: ", error);
  }
};

/**
 *
 * @param {string} username
 * @param {string} verificationUrl
 * @returns {Mailgen.Content}
 * @description It designs the email verification mail
 */
export const emailVerificationMailgenContent = (username, verificationUrl) => {
  return {
    body: {
      name: username,
      intro: "Welcome to our app! We're very excited to have you on board.",
      action: {
        instructions:
          "To verify your email please click on the following button:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Verify your email",
          link: verificationUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

/**
 *
 * @param {string} username
 * @param {string} verificationUrl
 * @returns {Mailgen.Content}
 * @description It designs the forgot password mail
 */
const forgotPasswordMailgenContent = (username, passwordResetUrl) => {
  return {
    body: {
      name: username,
      intro: "We got a request to reset the password of our account",
      action: {
        instructions:
          "To reset your password click on the following button or link:",
        button: {
          color: "#22BC66", // Optional action button color
          text: "Reset password",
          link: passwordResetUrl,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};
