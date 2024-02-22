<p style="font-size: 8pt; margin-bottom: 0; margin: 30

<img src="./Eclypses.png" style="width:50%;margin-right:0;"/>

<div align="center" style="font-size:40pt; font-weight:900; font-family:arial; margin-top:300px;">
Browser WebSocket Tutorial</div>

<div align="center" style="font-size:15pt; font-family:arial; " >
Using MTE version 3.1.x</div>

# Introduction

This tutorial shows you how to implement the MTE into an existing WebSocket connection. This is only one example, the MTE does NOT require the usage of WebSockets, you can use whatever communication protocol that is needed.

The SDK that you received from Eclypses may not include the MKE or MTE FLEN add-ons. If your SDK contains either the MKE or the Fixed Length add-ons, the name of the SDK will contain "-MKE" or "-FLEN". If these add-ons are not there and you need them please work with your sales associate. If there is no need, please just ignore the MKE and FLEN options.

Here is a short explanation of when to use each, but it is encouraged to either speak to a sales associate or read the dev guide if you have additional concerns or questions.

**_MTE Core:_** This is the recommended version of the MTE to use. Unless payloads are large or sequencing is needed this is the recommended version of the MTE and the most secure.

**_MTE MKE:_** This version of the MTE is recommended when payloads are very large, the MTE Core would, depending on the token byte size, be multiple times larger than the original payload. Because this uses the MTE technology on encryption keys and encrypts the payload, the payload is only enlarged minimally.

**_MTE Fixed Length:_** This version of the MTE is very secure and is used when the resulting payload is desired to be the same size for every transmission. The Fixed Length add-on is mainly used when using the sequencing verifier with MTE. In order to skip dropped packets or handle asynchronous packets the sequencing verifier requires that all packets be a predictable size. If you do not wish to handle this with your application then the Fixed Length add-on is a great choice. This is ONLY an Encoder change - the Decoder that is used is the MTE Core Decoder.

In this tutorial we are creating an MTE Encoder and an MTE Decoder on a client that exists in the browser. This is only needed when there are messages being sent from both sides. If only one side of your application is sending messages, then the side that sends the messages should have an MTE Encoder and the side receiving the messages needs only an MTE Decoder. You will need to pair this tutorial with a server in order for the WebSocket requests to communicate.

**IMPORTANT:**

**NOTE:** _The solution provided in this tutorial does NOT include the MTE library or any supporting MTE library files. If you have NOT been provided a MTE library and supporting files, please contact Eclypses Inc. The solution will only work AFTER the MTE library and any required MTE library files have been included._

**NOTE:** _This tutorial is provided in TypeScript. If you are not using TypeScript and instead using JavaScript, simply ignore the additional TypeScript syntax in the instructions. You will receive the same result._

# Tutorial Overview

The structure of this tutorial is as follows:

```bash
.
├── start
└── finish
```

| Directory | Description                                                               |
| --------- | ------------------------------------------------------------------------- |
| `finish`  | Example of project after completing the tutorial to reference             |
| `start`   | Project where you can follow along with the tutorial to implement the MTE |

_There is only a client version of this tutorial. It is recommended to follow an additional Eclypses tutorial with a different language/framework that supports a server using the WebSocket communication protocol in order to successfully pair them together._

# MTE Implementation

1. **Add MTE to your project**

   - Locate the TypeScript or JavaScript MTE compressed directory that was provided to you
   - Add the `Mte.ts` file into your project solution

2. **Import the following from `Mte.ts` in your `app.component.ts` file**

   ```typescript
   import {
     MteDec, // Only if you are using MTE Core
     MteEnc, // Only if you are using MTE Core
     MteStatus,
     MteBase,
     MteWasm,
     MteMkeDec, // Only if you are using MKE
     MteMkeEnc, // Only if you are using MKE
     MteFlenEnc, // Only if you are using MTE FLEN
   } from "./Mte";
   ```

3. **Add default state for the following MTE properties that we will need to globally access.**

   ```typescript
   let base: MteBase;
   let wasm: MteWasm;
   let decoderStatus = MteStatus.mte_status_success;
   let encoderStatus = MteStatus.mte_status_success;

   //---------------------------------------------------
   // Comment out to use MKE or MTE FLEN instead of MTE Core
   //---------------------------------------------------
   let decoder: MteDec;
   let encoder: MteEnc;

   //---------------------------------------------------
   // Uncomment to use MKE instead of MTE Core
   //---------------------------------------------------
   // let decoder: MteMkeDec;
   // let encoder: MteMkeEnc;

   //---------------------------------------------------
   // Uncomment to use MTE FLEN instead of MTE Core
   //---------------------------------------------------
   // const fixedLength = 8;
   // let encoder: MteFlenEnc;
   // let decoder: MteDec;
   ```

4. **Next, we need to be able to get the entropy, nonce, and identifier values.**

   - These values should be treated like encryption keys and never exposed. For demonstration purposes in this tutorial we are simply allowing default values of 0 to be set. In a production environment these values should be protected and not available to outside sources. For the entropy, we have to determine the size of the allowed entropy value based on the drbg we have selected. A code sample below is included to demonstrate how to get these values.

   - We are adding 1 to the Decoder nonce so that the return value changes. This is optional, the same nonce can be used for the Encoder and Decoder. Client side values will be switched so they match up to the Encoder/Decoder and vice versa.

     ```typescript
     let encoderNonce = "1";
     let decoderNonce = "0";
     let identifier = "demo";
     let encoderEntropy = "";
     let decoderEntropy = "";
     ```

   - To set the entropy in the tutorial we are getting the minimum bytes required and creating a string of that length that contains all zeros.

   - You will need an instance of the Encoder or Decoder to get the correct entropy based on the DRBG that they are using with the helper method `getDrbg()`

     ```typescript
     const entropyMinBytes = base.getDrbgsEntropyMinBytes(encoder.getDrbg());
     entropy = entropyMinBytes > 0 ? "0".repeat(entropyMinBytes) : entropy;
     ```

5. **Create an async function to instantiate the `MteWasm` and `MteBase`.**

   - `MteWasm` should only be instantiated once in your application.
   - This method returns a promise, so make sure you `await` it in an async function.
   - `MteBase` gives us access to MTE helper methods.
     - You must pass an instantiated `MteWasm` into `MteBase`.

   ```typescript
   const instantiateMte = async () => {
     wasm = new MteWasm();
     await wasm.instantiate();
     base = new MteBase(wasm);
   };
   ```

6. **To ensure the MTE library is licensed correctly run the license check, and to ensure the DRBG is set up correctly run the DRBG's self test in another function**

   - The `licenseCompanyName`, and `licenseKey` below should be replaced with your company’s MTE license information provided by Eclypses. If a trial version of the MTE is being used, any value can be passed into those fields for it to work.

   ```typescript
   const runMteTests = () => {
     const licenseCompany = 'Eclypses Inc.';
     const licenseKey = 'Eclypses123';

     // Initialize MTE license.
     // If a license code is not required (e.g., trial mode), this can be skipped.
     if (!base.initLicense(licenseCompany, licenseKey)) {
       const licenseStatus = MteStatus.mte_status_license_error;

       console.error(
         `License error (${base.getStatusName(
           licenseStatus,
         )}): ${base.getStatusDescription(
           licenseStatus,
         )}. Press any key to end.`,
       );
     }
   ```

7. **Create MTE Decoder Instance and MTE Encoder Instances.**

   Here is a sample function that creates the Decoder.

```typescript
const createDecoder = () => {
  //---------------------------------------------------
  // Comment out to use MKE instead of MTE Core
  //---------------------------------------------------
  decoder = MteDec.fromdefault(wasm);

  //---------------------------------------------------
  // Uncomment to use MKE instead of MTE Core
  //---------------------------------------------------
  // decoder = MteMkeDec.fromdefault(wasm);

  // Check how long entropy we need and set default
  const entropyMinBytes = base.getDrbgsEntropyMinBytes(decoder.getDrbg());
  decoderEntropy =
    entropyMinBytes > 0 ? "0".repeat(entropyMinBytes) : decoderEntropy;

  decoder.setEntropyStr(decoderEntropy);
  decoder.setNonce(decoderNonce);
  decoderStatus = decoder.instantiate(identifier);

  if (base.statusIsError(decoderStatus)) {
    console.error(
      `Failed to initialize the MTE Decoder engine.  Status: ${base.getStatusName(
        decoderStatus
      )} / ${base.getStatusDescription(decoderStatus)}`
    );
  }
};
```

- (For further info on Decoder constructor – Check out the Developers Guide)\*

Here is a sample function that creates the MTE Encoder.

```typescript
const createEncoder = () => {
  //---------------------------------------------------
  // Comment out to use MKE or MTE FLEN instead of MTE Core
  //---------------------------------------------------
  encoder = MteEnc.fromdefault(wasm);

  //---------------------------------------------------
  // Uncomment to use MKE instead of MTE Core
  //---------------------------------------------------
  // encoder = MteMkeEnc.fromdefault(wasm);

  //---------------------------------------------------
  // Uncomment to use MTE FLEN instead of MTE Core
  //---------------------------------------------------
  // encoder = MteFlenEnc.fromdefault(wasm, fixedLength);

  // Check how long entropy we need and set default
  const entropyMinBytes = base.getDrbgsEntropyMinBytes(encoder.getDrbg());
  encoderEntropy =
    entropyMinBytes > 0 ? "0".repeat(entropyMinBytes) : encoderEntropy;

  encoder.setEntropyStr(encoderEntropy);
  encoder.setNonce(encoderNonce);
  encoderStatus = encoder.instantiate(identifier);

  if (base.statusIsError(encoderStatus)) {
    console.error(
      `Failed to initialize the MTE Encoder engine.  Status: ${base.getStatusName(
        encoderStatus
      )} / ${base.getStatusDescription(encoderStatus)}`
    );
  }
};
```

- (For further info on Encode constructor – Check out the Developers Guide)\*

8. **Next, we need to add the MTE calls to encode and decode the messages that we are sending and receiving inside of the `onSubmit()` method.**

- Ensure the Encoder is called to encode the outgoing text, then the Decoder is called to decode the incoming response.

- Please check out the Developers Guide for further information on the various encoding and decoding methods.

  Here is a sample of how to do this for the Encoder

  ```typescript
  let encodedMessage: Uint8Array | null;
  ```

({ status: encoderStatus, arr: encodedMessage } = encoder.encodeStr(
message.value,
));

if (base.statusIsError(encoderStatus)) {
console.error(
`Error encoding: Status: ${base.getStatusName( encoderStatus, )} / ${base.getStatusDescription(encoderStatus)}`,
);
}

````



Here is a sample of how to do this for the Decoder

```typescript
({
status: decoderStatus,
str: decodedMessage.value as string | null,
} = decoder.decodeStr(byteArray));

if (base.statusIsError(decoderStatus)) {
console.error(
 `Error decoding: Status: ${base.getStatusName(
   decoderStatus,
 )} / ${base.getStatusDescription(decoderStatus)}`,
);
}
````

9. **Lastly, we need to invoke our functions in the correct order.**

   - First, we `await` and instantiate the MTE on initial render (_Hint: wrap everything in a self invoking async function_ )

   - Second, we run the MTE tests

   - Third, we create the Encoder and the Decoder

     ```typescript
     await instantiateMte();
     runMteTests();
     createEncoder();
     createDecoder();
     onSubmit();
     ```

**_The Client side of the MTE WebSocket Browser Tutorial should now be ready for use on your device._**

<div style="page-break-after: always; break-after: page;"></div>

# Contact Eclypses

<img src="Eclypses.png" style="width:8in;"/>

<p align="center" style="font-weight: bold; font-size: 22pt;">For more information, please contact:</p>
<p align="center" style="font-weight: bold; font-size: 22pt;"><a href="mailto:info@eclypses.com">info@eclypses.com</a></p>
<p align="center" style="font-weight: bold; font-size: 22pt;"><a href="https://www.eclypses.com">www.eclypses.com</a></p>
<p align="center" style="font-weight: bold; font-size: 22pt;">+1.719.323.6680</p>

<p style="font-size: 8pt; margin-bottom: 0; margin: 300px 24px 30px 24px; " >
<b>All trademarks of Eclypses Inc.</b> may not be used without Eclypses Inc.'s prior written consent. No license for any use thereof has been granted without express written consent. Any unauthorized use thereof may violate copyright laws, trademark laws, privacy and publicity laws and communications regulations and statutes. The names, images and likeness of the Eclypses logo, along with all representations thereof, are valuable intellectual property assets of Eclypses, Inc. Accordingly, no party or parties, without the prior written consent of Eclypses, Inc., (which may be withheld in Eclypses' sole discretion), use or permit the use of any of the Eclypses trademarked names or logos of Eclypses, Inc. for any purpose other than as part of the address for the Premises, or use or permit the use of, for any purpose whatsoever, any image or rendering of, or any design based on, the exterior appearance or profile of the Eclypses trademarks and or logo(s).
</p>
