const module1 = require('./extractedtext');

function calculateTotalScore(found) {
  var totalScore = found.score.reduce(function (accumulator, currentValue) {
    return accumulator + currentValue;
  }, 0);
  return totalScore;
}

async function sendFlexMessage(client, event, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri) {
  var totalScore = calculateTotalScore(found);
  await client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: 'นี้คือไฟล์ excel ของท่าน',
    contents: {
      "type": "bubble",
      "body": {
        "type": "box",
        "layout": "vertical",
        "contents": [
          {
            "type": "text",
            "text": "SlipCheckBB",
            "weight": "bold",
            "color": "#1DB446",
            "size": "md",
            "margin": "none"
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "color": displayIsDuplicate === "สลิปซ้ำ" ? "#FF0000" : (totalScore < 50 ? "#FF0000" : (totalScore < 80 ? "#FFD700" : "#1DB446")),
                "text": "ผลการตรวจสอบ",
                "size": "24px",
                "align": "start",
                "wrap": false,
                "weight": "bold"
              },
              {
                "type": "text",
                "size": "24px",
                "color": displayIsDuplicate === "สลิปซ้ำ" ? "#FF0000" : (totalScore < 50 ? "#FF0000" : (totalScore < 80 ? "#FFD700" : "#1DB446")),
                "align": "end",
                "text": displayIsDuplicate === "สลิปซ้ำ" ? displayIsDuplicate : totalScore + " %",
                "weight": "bold",
                "wrap": false,
                "flex": 0,
                "offsetTop": "none",
                "offsetEnd": "md"
              }
            ],
          },
          {
            "type": "box",
            "layout": "horizontal",
            "contents": [
              {
                "type": "text",
                "text": "รูปภาพสลิป",
                "size": "sm",
                "color": "#555555",
                "flex": 0
              },
              {
                "type": "text",
                "text": "คลิกที่นี้",
                "size": "sm",
                "color": "#0fbd20",
                "align": "start",
                "action": {
                  "type": "uri",
                  "label": "action",
                  "uri": imgUri
                }
              }
            ],
            "margin": "none"
          },
          {
            "type": "separator",
            "margin": "lg"
          },
          {
            "type": "box",
            "layout": "vertical",
            "margin": "lg",
            "spacing": "sm",
            "contents": [
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "size": "md",
                    "color": "#555555",
                    "flex": 0,
                    "text": displayData.senderDisplayName,
                    "align": "center"
                  },
                  {
                    "type": "text",
                    "text": displayData.sendingBank,
                    "size": "sm",
                    "color": "#111111",
                    "align": "center"
                  }
                ]
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "size": "lg",
                    "color": "#0fbd20",
                    "flex": 0,
                    "text": "|",
                    "align": "center"
                  },
                  {
                    "type": "text",
                    "text": "V",
                    "size": "lg",
                    "color": "#0fbd20",
                    "align": "center",
                    "margin": "none",
                    "flex": 0,
                    "position": "relative",
                    "offsetBottom": "10px"
                  }
                ],
                "margin": "md"
              },
              {
                "type": "box",
                "layout": "vertical",
                "contents": [
                  {
                    "type": "text",
                    "size": "md",
                    "color": "#555555",
                    "flex": 0,
                    "text": displayData.receiverDisplayName,
                    "align": "center"
                  },
                  {
                    "type": "text",
                    "text": displayData.receivingBank,
                    "size": "sm",
                    "color": "#111111",
                    "align": "center"
                  }
                ],
                "margin": "none"
              },
              {
                "type": "separator",
                "margin": "xxl"
              },
              {
                "type": "box",
                "layout": "horizontal",
                "margin": "lg",
                "contents": [
                  {
                    "type": "text",
                    "text": "จำนวนเงิน :",
                    "size": "sm",
                    "color": "#555555"
                  },
                  {
                    "type": "text",
                    "text": displayData.transactionAmount + " บาท",
                    "size": "sm",
                    "color": "#111111",
                    "align": "end"
                  }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "วันที่ทำรายการ :",
                    "size": "sm",
                    "color": "#555555"
                  },
                  {
                    "type": "text",
                    "text": module1.formatDateThai(dateTime.dateTime),
                    "size": "sm",
                    "color": "#111111",
                    "align": "end"
                  }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "size": "sm",
                    "color": "#555555",
                    "text": "เวลาที่ทำรายการ"
                  },
                  {
                    "type": "text",
                    "text": module1.formatTimeThai(dateTime.dateTime),
                    "size": "sm",
                    "color": "#111111",
                    "align": "end"
                  }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "หมายเลขอ้างอิง :",
                    "size": "sm",
                    "color": "#555555"
                  },
                  {
                    "type": "text",
                    "text": displayData.transferRef,
                    "wrap": true,
                    "size": "xs",
                    "flex": 1,
                    "color": "#111111",
                    "align": "end",
                  }
                ]
              },
              {
                "type": "box",
                "layout": "horizontal",
                "contents": [
                  {
                    "type": "text",
                    "text": "สถานะการบันทึก :",
                    "size": "sm",
                    "color": "#555555"
                  },
                  {
                    "type": "text",
                    "text": displayIsDuplicate === "สลิปซ้ำ" ? "ไม่ได้ถูกบันทึก" : statussave,
                    "size": "sm",
                    "color": "#111111",
                    "align": "end"
                  }
                ]
              },
              {
                "type": "separator",
                "margin": "xxl"
              }
            ]
          },
          {
            "type": "box",
            "layout": "horizontal",
            "margin": "md",
            "contents": [
              {
                "type": "text",
                "size": "sm",
                "color": "#aaaaaa",
                "flex": 0,
                "text": "หมายเหตุ :"
              },
              {
                "type": "text",
                "wrap": true,
                "text": `${uniqueFoundWithoutNewline.length > 1 ? (senandrecei ? 'ชื่อผู้ส่งและชื่อผู้รับเป็นภาษาอังกฤษจึงไม่สามารถตรวจสอบได้, ' + uniqueFoundWithoutNewline.slice(2, 6).filter(item => item !== 'ถูกต้อง').join(', ') : uniqueFoundWithoutNewline.filter(item => item !== 'ถูกต้อง')) : 'ถูกต้อง'}`,
                "color": `${uniqueFoundWithoutNewline.length > 1 ? '#FF0000' : '#1DB446'}`,
                "size": "xs",
                "align": "end"
              }
            ]
          }
        ]
      },
      "styles": {
        "footer": {
          "separator": true
        }
      }
    }
  });

/*
  if (totalScore < 80) {
    // Create a Flex Message to ask whether to save
    await client.pushMessage(event.source.userId, {
      type: 'flex',
      altText: 'คะแนนต่ำกว่า 80 คะแนน คุณต้องการบันทึกข้อมูลหรือไม่?',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'คะแนนต่ำกว่า 80 คะแนน',
              weight: 'bold',
              color: '#FF0000',
              size: 'md',
              margin: 'none'
            },
            {
              type: 'text',
              text: 'คุณต้องการบันทึกข้อมูลหรือไม่?',
              size: 'sm',
              color: '#555555',
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'horizontal',
              margin: 'md',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#1DB446',
                  action: {
                    type: 'message',
                    label: 'บันทึก',
                    text: 'บันทึก'
                  }
                },
                {
                  type: 'button',
                  style: 'secondary',
                  color: '#FF0000',
                  action: {
                    type: 'message',
                    label: 'ไม่บันทึก',
                    text: 'ไม่บันทึก'
                  }
                }
              ]
            }
          ]
        }
      }
    });

    return;
  }
*/
}

// Export the function to make it accessible from other files
module.exports = {
  calculateTotalScore,
  sendFlexMessage,
};