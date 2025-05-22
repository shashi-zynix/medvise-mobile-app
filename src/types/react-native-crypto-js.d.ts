// Declaration file for react-native-crypto-js
declare module 'react-native-crypto-js' {
  namespace CryptoJS {
    interface WordArray {
      words: number[];
      sigBytes: number;
      toString(encoder?: any): string;
      concat(wordArray: WordArray): WordArray;
      clamp(): void;
      clone(): WordArray;
    }

    interface CipherParams {
      ciphertext: WordArray;
      key: WordArray;
      iv: WordArray;
      salt: WordArray;
      algorithm: any;
      mode: any;
      padding: any;
      blockSize: number;
      formatter: any;
      toString(): string;
    }

    namespace enc {
      const Hex: any;
      const Latin1: any;
      const Utf8: any;
      const Utf16: any;
      const Utf16BE: any;
      const Utf16LE: any;
      const Base64: any;
    }

    namespace AES {
      function encrypt(message: string | WordArray, key: string | WordArray, cfg?: any): CipherParams;
      function decrypt(ciphertext: CipherParams | string, key: string | WordArray, cfg?: any): WordArray;
    }

    namespace mode {}
    namespace pad {}
    namespace format {}
    namespace algo {
      const AES: any;
      const SHA1: any;
      const SHA256: any;
      const SHA512: any;
      const MD5: any;
    }

    function MD5(message: string | WordArray, key?: string | WordArray, cfg?: any): WordArray;
    function SHA1(message: string | WordArray, key?: string | WordArray, cfg?: any): WordArray;
    function SHA256(message: string | WordArray, key?: string | WordArray, cfg?: any): WordArray;
    function SHA512(message: string | WordArray, key?: string | WordArray, cfg?: any): WordArray;
  }

  export default CryptoJS;
}
