/*
THIS SOFTWARE MAY NOT BE USED FOR PRODUCTION. Otherwise,
The MIT License (MIT)

Copyright (c) Eclypses, Inc.

All rights reserved.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* Step 2 */
import {
  MteDec,
  MteEnc,
  MteStatus,
  MteBase,
  MteWasm,
  MteMkeDec,
  MteMkeEnc,
  MteFlenEnc,
} from "./Mte";
import { fromByteArray } from "base64-js";

// This tutorial uses WebSockets for communication.
// It should be noted that the MTE can be used with any type of communication. (WebSockets are not required!)

(async () => {
  const message: HTMLInputElement = document.querySelector("#output")!;
  const outgoingEncodedMessage: HTMLInputElement =
    document.querySelector("#encoded-output")!;
  const incomingEncodedMessage: HTMLInputElement =
    document.querySelector("#encoded-input")!;
  const decodedMessage: HTMLInputElement = document.querySelector("#input")!;
  const ip: HTMLInputElement = document.querySelector("#ip")!;
  const port: HTMLInputElement = document.querySelector("#port")!;
  const form: HTMLFormElement = document.querySelector("#form")!;

  /* Step 3 */
  // Define default values for MTE
  let base: MteBase;
  let wasm: MteWasm;
  let decoderStatus = MteStatus.mte_status_success;
  let encoderStatus = MteStatus.mte_status_success;

  // ---------------------------------------------------
  // Comment out to use MKE or MTE FLEN (only Encoder) instead of MTE Core
  // ---------------------------------------------------
  let decoder: MteDec;
  let encoder: MteEnc;

  // ---------------------------------------------------
  // Uncomment to use MKE instead of MTE Core
  // ---------------------------------------------------
  // let decoder: MteMkeDec;
  // let encoder: MteMkeEnc;

  // ---------------------------------------------------
  // Uncomment to use MTE FLEN instead of MTE Core
  // ---------------------------------------------------
  // const fixedLength = 8;
  // let encoder: MteFlenEnc;
  // let decoder: MteDec;

  /* Step 3 CONTINUED... */
  // OPTIONAL!!! adding 1 to Encoder nonce so return value changes -- same nonce can be used for Encoder and Decoder
  // On server side values will be switched so they match up Encoder to Decoder and vise versa
  const encoderNonce = "1";
  const decoderNonce = "0";
  const identifier = "demo";
  let encoderEntropy = "";
  let decoderEntropy = "";

  /* Step 4 */
  // Instantiate the MteWasm and MteBase
  const instantiateMte = async (): Promise<void> => {
    wasm = new MteWasm();
    await wasm.instantiate();
    base = new MteBase(wasm);
  };

  /* Step 5 */
  // Run MTE Tests
  const runMteTests = (): void => {
    const licenseCompany = "Eclypses Inc.";
    const licenseKey = "Eclypses123";

    // Initialize MTE license.
    // If a license code is not required (e.g., trial mode), this can be skipped.
    if (!base.initLicense(licenseCompany, licenseKey)) {
      const licenseStatus = MteStatus.mte_status_license_error;

      console.error(
        `License error (${base.getStatusName(
          licenseStatus
        )}): ${base.getStatusDescription(licenseStatus)}. Press any key to end.`
      );
    }
  };

  /* Step 6 */
  // Create Instance of the Encoder
  const createEncoder = (): void => {
    // ---------------------------------------------------
    // Comment out to use MKE or MTE FLEN instead of MTE Core
    // ---------------------------------------------------
    encoder = MteEnc.fromdefault(wasm);

    // ---------------------------------------------------
    // Uncomment to use MKE instead of MTE Core
    // ---------------------------------------------------
    // encoder = MteMkeEnc.fromdefault(wasm);

    // ---------------------------------------------------
    // Uncomment to use MTE FLEN instead of MTE Core
    // ---------------------------------------------------
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

  /* Step 6 CONTINUED... */
  // Create Instance of the Decoder
  const createDecoder = (): void => {
    // ---------------------------------------------------
    // Comment out to use MKE instead of MTE Core
    // ---------------------------------------------------
    decoder = MteDec.fromdefault(wasm);

    // ---------------------------------------------------
    // Uncomment to use MKE instead of MTE Core
    // ---------------------------------------------------
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

  const onSubmit = async (): Promise<void> => {
    ip.value = ip.value ? ip.value : "localhost";
    port.value = port.value ? port.value : "27015";

    const uri = `ws://${ip.value}:${port.value}/`;

    const webSocket = new WebSocket(uri);
    webSocket.binaryType = "arraybuffer";

    webSocket.addEventListener("open", (_) => {
      form.addEventListener("submit", (e) => {
        (async () => {
          e.preventDefault();

          /* Step 7 */
          // Encode message and ensure successful
          let encodedMessage: Uint8Array | null;
          ({ status: encoderStatus, arr: encodedMessage } = encoder.encodeStr(
            message.value
          ));

          if (base.statusIsError(encoderStatus)) {
            console.error(
              `Error encoding: Status: ${base.getStatusName(
                encoderStatus
              )} / ${base.getStatusDescription(encoderStatus)}`
            );

            webSocket.close();
          }

          outgoingEncodedMessage.value = fromByteArray(encodedMessage!);

          // Send encoded message over WebSocket and receive response
          encodedMessage && webSocket.send(encodedMessage);
        })().catch((error) => {
          throw error;
        });
      });

      webSocket.addEventListener("message", (e: MessageEvent<ArrayBuffer>) => {
        const byteArray = new Uint8Array(e.data);
        incomingEncodedMessage.value = fromByteArray(byteArray);

        /* Step 7 CONTINUED... */
        // Decode received bytes and ensure successful.
        ({ status: decoderStatus, str: decodedMessage.value as string | null } =
          decoder.decodeStr(byteArray));

        if (base.statusIsError(decoderStatus)) {
          console.error(
            `Error decoding: Status: ${base.getStatusName(
              decoderStatus
            )} / ${base.getStatusDescription(decoderStatus)}`
          );

          webSocket.close();
        }

        message.value = "";
      });
    });
  };

  await instantiateMte();
  runMteTests();
  createEncoder();
  createDecoder();
  await onSubmit();
})().catch((error) => {
  throw error;
});
