const dotenv = require('dotenv');
const fetch = require('node-fetch');

const env = dotenv.config().parsed;

const jsQR = require('jsqr');
const { createCanvas, loadImage } = require('canvas');

const { Storage } = require('@google-cloud/storage');
const xlsx = require('xlsx');
const moment = require('moment');

const storage = new Storage({
  projectId: env.Project_Firebase_Id,
  keyFilename: 'firebase.json',
});

const bucket = storage.bucket(env.Storage_Bucket_Firebase);

async function getImage(id) {
  try {
    const url = `https://api-data.line.me/v2/bot/message/${id}/content`;
    console.log(id);

    const response = await fetch(url, {
      headers: {
        'Authorization': 'Bearer ' + env.ACCESS_TOKEN,
      },
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const imgBuffer = await response.buffer();

    const qrCodeData = await readQRCode(imgBuffer);
    console.log('QR Code Data:', qrCodeData);

    const imgBase64 = imgBuffer.toString('base64');

    return { imgBase64, qrCodeData, imgBuffer };
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

function readQRCode(imageBuffer) {
  return new Promise(async (resolve, reject) => {
    try {
      const canvas = createCanvas();
      const context = canvas.getContext('2d');

      const image = await loadImage(imageBuffer);
      canvas.width = image.width;
      canvas.height = image.height;

      context.drawImage(image, 0, 0, image.width, image.height);
      const imageData = context.getImageData(0, 0, image.width, image.height);

      const code = jsQR(imageData.data, image.width, image.height);
      resolve(code ? code.data : null);
    } catch (error) {
      reject(error);
    }
  });
}

const uploadImgToStorage = async (fileBuffer, fileName) => {
  const file = bucket.file(fileName);

  const stream = file.createWriteStream({
    metadata: {
      contentType: 'image/png',
    },
  });

  return new Promise((resolve, reject) => {
    stream.on('finish', () => {
      resolve();
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.end(fileBuffer);
  });
};

async function generateDownloadUrl(flieimg) {
  try {
    const file = bucket.file(flieimg);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: '01-01-2030',
    });

    //console.log('Generated download URL:', url);
    return url;
  } catch (error) {
    //console.error('Error generating download URL:', error);
    throw error;
  }
}


const uploadFileToStorage = async (filePath, fileName) => {
  await bucket.upload(filePath, {
    destination: fileName,
  });

  const file = bucket.file(fileName);
  return file.getSignedUrl({ action: 'read', expires: '03-09-2500' });
};

async function extractTextFromImage(blob) {
  try {
    const base64Content = blob.toString('base64');

    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${env.VISION_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Content,
              },
              features: [
                {
                  type: 'TEXT_DETECTION',
                },
              ],
            },
          ],
        }),
      }
    );

    const result = await visionResponse.json();
    const responses = result.responses;

    if (responses && responses.length > 0) {
      const extractedText = responses[0]?.fullTextAnnotation?.text || 'No text found';

      // Remove commas from extractedText
      const extractedTextFix = extractedText.replace(/,/g, '').replace(/่ ํา/g, 'ำ');

      // Split the text into an array of lines
      const extractedTextArray = extractedTextFix.split('\n');

      const filteredNumberArray = extractedTextArray.map(item => item.replace(/[^a-zA-Z0-9.]/g, ''));
      const filteredText = extractedTextArray.map(item => item.trim().replace(/[^a-zA-Z\sก-๙]/g, ''));

      //console.log("001" + extractedTextArray);
      //console.log("002" + extractedTextFix);
      //console.log("003" + filteredText);

      // Combine filteredNumberArray and filteredTextArray into a single array
      const combinedArray = filteredNumberArray.concat(filteredText, extractedTextArray).filter(Boolean);

      const convertedArray = combinedArray.map(item => item.trim().replace(/^0\s*/, ''));

      return { convertedArray, extractedTextFix };
    } else {
      console.error('No valid responses found in Vision API result:', result);
      return { combinedArray: ['No text found'] };
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return { combinedArray: ['Error processing image'] };
  }
}

function extractDetails(jsonData) {
  var bankMapping = {
    "002": "ธนาคารกรุงเทพ",
    "004": "ธนาคารกสิกรไทย",
    "006": "ธนาคารกรุงไทย",
    "011": "ธนาคารทหารไทยธนชาต",
    "014": "ธนาคารไทยพาณิชย์",
    "025": "ธนาคารกรุงศรีอยุธยา",
    "069": "ธนาคารเกียรตินาคินภัทร",
    "022": "ธนาคารซีไอเอ็มบีไทย",
    "067": "ธนาคารทิสโก้",
    "024": "ธนาคารยูโอบี",
    "071": "ธนาคารไทยเครดิตเพื่อรายย่อย",
    "073": "ธนาคารแลนด์ แอนด์ เฮ้าส์",
    "070": "ธนาคารไอซีบีซี (ไทย)",
    "098": "ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย",
    "034": "ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร",
    "035": "ธนาคารเพื่อการส่งออกและนำเข้าแห่งประเทศไทย",
    "030": "ธนาคารออมสิน",
    "033": "ธนาคารอาคารสงเคราะห์"
  };

  try {
    // Check if jsonData.sender is defined before accessing properties
    var senderDisplayName = jsonData.data.sender.displayName
    var receiverDisplayName = jsonData.data.receiver.displayName

    var transactionTime = jsonData.data.transTime;
    var transactionDate = jsonData.data.transDate;
    var transactionAmount = jsonData.data.amount;
    var transferRef = jsonData.data.transRef;

    var transferRef1 = jsonData.data.ref1;
    var transferRef2 = jsonData.data.ref2;
    var transferRef3 = jsonData.data.ref3;

    // Access the sendingBank directly from jsonData.data
    var sendingBankCode = jsonData.data.sendingBank;

    var receivingBankCode = jsonData.data.receivingBank;

    var sendingBank = bankMapping[sendingBankCode] || "Unknown Bank";
    var receivingBank = bankMapping[receivingBankCode] || "Unknown Bank";

    var senderAccount = jsonData.sender?.account?.value || "Unknown Sender Account";
    var receiverAccount = jsonData.receiver?.account?.value || "Unknown Receiver Account";
    var isSuccess = jsonData.data.success;

    return {
      senderDisplayName: senderDisplayName,
      receiverDisplayName: receiverDisplayName,
      transactionTime: transactionTime,
      transactionDate: transactionDate,
      transactionAmount: transactionAmount,
      transferRef: transferRef,
      sendingBank: sendingBank,
      receivingBank: receivingBank,
      senderAccount: senderAccount,
      receiverAccount: receiverAccount,
      isSuccess: isSuccess,
      ref1: transferRef1,
      ref2: transferRef2,
      ref3: transferRef3
    };
  } catch (e) {
    return 'Error processing data: ' + e.toString();
  }
}

function removeOneDuplicate(array) {
  const seen = {};

  const uniqueArray = array.filter(function (item) {
    return seen.hasOwnProperty(item) ? false : (seen[item] = true);
  });

  return uniqueArray;
}

// บันทึกรหัสในไฟล์ convertDateTime.js
function convertToDateTime(transData) {
  var dateString = transData.transDate;
  var timeString = transData.transTime;

  var dateTime = new Date(
    dateString.substring(0, 4),
    parseInt(dateString.substring(4, 6)) - 1,
    dateString.substring(6, 8),
    timeString.substring(0, 2),
    timeString.substring(3, 5),
    timeString.substring(6, 8)
  );

  var monthIndex = dateTime.getMonth();
  var months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  if (monthIndex >= 0 && monthIndex < months.length) {
    var monthAbbreviation = months[monthIndex];
    var formattedDateshrot = dateTime.toLocaleDateString('th-TH', { day: 'numeric' }) + ' ' + monthAbbreviation + dateTime.toLocaleDateString('th-TH', { year: 'numeric' });
    formattedDateshrot = formattedDateshrot.replace(/พ.ศ./, '');

    //console.log(formattedDateshrot.trim());

    // ส่งค่าทั้ง dateTime และ formattedDateshrot ออกมา
    return { dateTime, formattedDateshrot: formattedDateshrot.trim() };
  }
}

function formatDateTimeThai(dateTime) {
  var options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
  var formatter = new Intl.DateTimeFormat('th-TH', options);
  return formatter.format(dateTime);
}

function formatDateThai(dateTime) {
  var options = { day: 'numeric', month: 'long', year: 'numeric' };
  var formatter = new Intl.DateTimeFormat('th-TH', options);
  return formatter.format(dateTime);
}

function formatTimeThai(dateTime) {
  var options = { hour: 'numeric', minute: 'numeric', second: 'numeric' };
  var formatter = new Intl.DateTimeFormat('th-TH', options);
  return formatter.format(dateTime);
}

async function saveUserData(userId, displayData, uniqueFoundWithoutNewline, dateTime, Datauser, imgUri) {
    try {
      const documentRef = await Datauser.doc(displayData.transferRef);
      const existingDoc = await documentRef.get();
  
      if (existingDoc.exists) {
        console.warn('ข้อมูลของคุณมีอยู่แล้ว');
        return "สลิปซ้ำ";
      }
  
      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}${(currentDate.getMonth() + 1).toString().padStart(2, '0')}${currentDate.getDate().toString().padStart(2, '0')}`;
      const formattedTime = `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}:${currentDate.getSeconds().toString().padStart(2, '0')}`;
  
      var currentDatetransData = { "transDate": formattedDate, "transTime": formattedTime };
      var resultString = uniqueFoundWithoutNewline.map(element => element.replace('ถูกต้อง', ''))
      var note = resultString.length === 2 && resultString.includes("ถูกต้อง") ? resultString.join(",").replace(/,+/g, ",") : resultString[0].replace(/,/g, "");

      const dataToUpdate = {
        'currentDateTime': await formatDateTimeThai(currentDatetransData.dateTime),
        'userid': userId,
        'date': displayData.transactionDate,
        'datetransfer': await formatDateThai(dateTime.dateTime),
        'timetransfer': await formatTimeThai(dateTime.dateTime),
        'sender': displayData.senderDisplayName,
        'receiver': displayData.receiverDisplayName,
        'amount': displayData.transactionAmount,
        'transactionId': displayData.transferRef,
        'note': note,
        'fileUrl': imgUri,
      };
  
      await Promise.all([
        await documentRef.set(dataToUpdate),
      ]);
      
      //console.log('User data saved successfully.');
      return "สลิปไม่ซ้ำ";
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  }

  const generateExcelForUser = async (userId, monthsAgo, firestore) => {
    try {
      const regexPattern = /^\d{2}-\d{4}$/;
      const number = /^\d{1,2}$/;
      //console.log("WOW: " + monthsAgo);
  
      let startDate;
  
      if (regexPattern.test(monthsAgo)) {
        startDate = moment(monthsAgo, 'MM-YYYY').startOf('month').format('YYYY-MM-DD');
      } else if (number.test(monthsAgo)) {
        startDate = monthsAgo === '1'
          ? moment().startOf('month').format('YYYY-MM-DD')
          : moment().subtract(monthsAgo - 1, 'months').startOf('month').format('YYYY-MM-DD');
      } else if (monthsAgo === 'ทั้งหมด' || monthsAgo === 'all') {
        var All = monthsAgo;
        console.error(All);
      } else {
        console.error('Invalid monthsAgo format');
        return null;
      }

      const userGreetingsRef = firestore.collection(userId);
      const querySnapshot = await userGreetingsRef.get();
  
      const excelData = [['รหัสอ้างอิง', 'วันเวลาที่บันทึก', 'วันที่โอน', 'เวลาที่โอน', 'ผู้ส่ง', 'ผู้รับ', 'ราคา', 'หมายเหตุ', 'File URL']];
      const wscols = [{ wch: 25 },{ wch: 30 },{ wch: 15 },{ wch: 10 },{ wch: 30 },{ wch: 30 },{ wch: 10 },{ wch: 30 },{ wch: 50 }];
  
      querySnapshot.forEach((doc) => {
      const transactionData = doc.data();
  
        if (
          transactionData.userid === userId &&
          moment(transactionData.date).isAfter(startDate) &&
          number.test(monthsAgo)
        ) {
          const row = [
            transactionData.transactionId,
            transactionData.currentDateTime,
            transactionData.datetransfer,
            transactionData.timetransfer,
            transactionData.sender,
            transactionData.receiver,
            transactionData.amount,
            transactionData.note,
            transactionData.fileUrl,
          ];
          excelData.push(row);
        } else if (
          transactionData.userid === userId &&
          moment(transactionData.date).isSame(startDate, 'month') &&
          regexPattern.test(monthsAgo)
        ) {
          const row = [
            transactionData.transactionId,
            transactionData.currentDateTime,
            transactionData.datetransfer,
            transactionData.timetransfer,
            transactionData.sender,
            transactionData.receiver,
            transactionData.amount,
            transactionData.note,
            transactionData.fileUrl,
          ];
          excelData.push(row);
        } else if (transactionData.userid === userId && (All === 'ทั้งหมด' || All === 'all')) {
          const row = [
            transactionData.transactionId,
            transactionData.currentDateTime,
            transactionData.datetransfer,
            transactionData.timetransfer,
            transactionData.sender,
            transactionData.receiver,
            transactionData.amount,
            transactionData.note,
            transactionData.fileUrl,
          ];
          excelData.push(row);
        }
      });
  
      const ws = xlsx.utils.aoa_to_sheet(excelData, { header: 1 });
      ws['!cols'] = wscols;
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Sheet 1');
      const excelFilePath = 'output.xlsx';
      xlsx.writeFile(wb, excelFilePath);
  
      console.log('สร้างไฟล์ Excel เรียบร้อยสำหรับผู้ใช้:', userId, 'ภายในเดือนที่ผ่านมา', monthsAgo, 'เดือน');
      return excelFilePath;
    } catch (error) {
      console.error('Error creating Excel file:', error);
      return null;
    }
  };
  
/*
  async function searchTime(word, userGreetingsRef) {
    const extract = 'Extractall';
  
    try {
      const existingDataSnapshot = await userGreetingsRef.child(extract).once('value');
      const existingUserData = existingDataSnapshot.val();
  
      // ตรวจสอบว่ามีข้อมูลหรือไม่
      if (existingUserData) {
        // ค้นหาคำในข้อมูลที่ดึงมา
        const foundWordData = Object.values(existingUserData).find(item => item === word.formattedDateshrot);
  
        if (foundWordData) {
          // ถ้าเจอคำ
          console.log(`คำ "${word.formattedDateshrot}" พบใน Firebase!`);
          // ทำสิ่งที่คุณต้องการทำ เช่น ส่งข้อมูลไปที่ displayData
          displayData(foundWordData);
        } else {
          // ถ้าไม่เจอคำ
          console.log(`คำ "${word.formattedDateshrot}" ไม่พบใน Firebase`);
        }
      } else {
        console.log('ไม่พบข้อมูลใน Firebase');
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Firebase:', error.message);
    }
  }
*/

module.exports = {
  getImage: getImage,
  uploadFileToStorage: uploadFileToStorage,
  extractTextFromImage: extractTextFromImage,
  extractDetails: extractDetails,
  removeOneDuplicate: removeOneDuplicate,
  convertToDateTime: convertToDateTime,
  formatDateThai: formatDateThai,
  formatTimeThai: formatTimeThai,
  formatDateTimeThai: formatDateTimeThai,
  saveUserData: saveUserData,
  uploadImgToStorage: uploadImgToStorage,
  generateExcelForUser: generateExcelForUser,
  generateDownloadUrl: generateDownloadUrl,
  //searchTime : searchTime
};