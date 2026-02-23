const OSS = require('ali-oss');
const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: 'foo',
  accessKeySecret: 'bar',
  bucket: 'baz'
});
const url1 = client.signatureUrl('test.pdf', { method: 'PUT', 'Content-Type': 'application/pdf', expires: 600 });
console.log('URL1:', url1);
