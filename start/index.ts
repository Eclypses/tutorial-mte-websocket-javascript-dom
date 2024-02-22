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

import { fromByteArray } from 'base64-js';

// This tutorial uses WebSockets for communication.
// It should be noted that the MTE can be used with any type of communication. (WebSockets are not required!)

const message: HTMLInputElement = document.querySelector('#output')!;
const outgoingEncodedMessage: HTMLInputElement =
  document.querySelector('#encoded-output')!;
const incomingEncodedMessage: HTMLInputElement =
  document.querySelector('#encoded-input')!;
const decodedMessage: HTMLInputElement = document.querySelector('#input')!;
const ip: HTMLInputElement = document.querySelector('#ip')!;
const port: HTMLInputElement = document.querySelector('#port')!;
const form: HTMLFormElement = document.querySelector('#form')!;

// Here is where you would want to define defaults for the MTE

const onSubmit = (): void => {
  ip.value = ip.value ? ip.value : 'localhost';
  port.value = port.value ? port.value : '27015';

  const uri = `ws://${ip.value}:${port.value}/`;

  const webSocket = new WebSocket(uri);
  webSocket.binaryType = 'arraybuffer';

  webSocket.addEventListener('open', (_) => {
    form.addEventListener('submit', (e) => {
      (async () => {
        e.preventDefault();

        // MTE Encoding the text would go here prior to sending over WebSocket instead
        // of using JavaScript TextEncoder
        const encodedMessage = new TextEncoder().encode(message.value);

        outgoingEncodedMessage.value = fromByteArray(encodedMessage);

        webSocket.send(encodedMessage);
      })().catch((error) => {
        throw error;
      });
    });

    webSocket.addEventListener('message', (e: MessageEvent<ArrayBuffer>) => {
      const byteArray = new Uint8Array(e.data);
      incomingEncodedMessage.value = fromByteArray(byteArray);

      // MTE Decoding the bytes would go here instead of using the JavaScript TextDecoder
      decodedMessage.value = new TextDecoder().decode(byteArray);

      message.value = '';
    });
  });
};

onSubmit();
