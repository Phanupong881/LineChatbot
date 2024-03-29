function calculateTotalScore(found) {
  var totalScore = found.score.reduce(function (accumulator, currentValue) {
    return accumulator + currentValue;
  }, 0);
  return totalScore;
}

const module1 = require('./extractedtext');

async function sendFlexMessage(client, event, userId, displayIsDuplicate, found, displayData, uniqueFoundWithoutNewline, senandrecei, statussave, dateTime, imgUri) {
  var totalScore = calculateTotalScore(found);
  await client.replyMessage(event.replyToken, {
    type: 'flex',
    altText: 'ผลการตรวจสอบสลิป',
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
                "color": displayIsDuplicate === "สลิปซ้ำ" || displayIsDuplicate == "ไม่ถูกต้อง" ? "#FF0000" : (totalScore < 50 ? "#FF0000" : (totalScore < 80 ? "#FFD700" : "#1DB446")),
                "text": displayIsDuplicate == "ไม่ถูกต้อง" ? "สลิปไม่ถูกต้อง" : "ผลการตรวจสอบ",
                "size": "24px",
                "align": "start",
                "wrap": false,
                "weight": "bold"
              },
              {
                "type": "text",
                "size": "24px",
                "color": displayIsDuplicate === "สลิปซ้ำ" || displayIsDuplicate == "ไม่ถูกต้อง" ? "#FF0000" : (totalScore < 50 ? "#FF0000" : (totalScore < 80 ? "#FFD700" : "#1DB446")),
                "align": "end",
                "text": displayIsDuplicate === "สลิปซ้ำ" || displayIsDuplicate === "ไม่ถูกต้อง"  ? (displayIsDuplicate == "ไม่ถูกต้อง" ? " " : displayIsDuplicate) : totalScore + " %",
                "weight": "bold",
                "wrap": true,
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
                "text": displayIsDuplicate == "สลิปซ้ำ" ? 'สลิปซ้ำ' : `${uniqueFoundWithoutNewline.length > 1 ? (senandrecei ? 'ชื่อผู้ส่งและชื่อผู้รับเป็นภาษาอังกฤษจึงไม่สามารถตรวจสอบได้, ' + uniqueFoundWithoutNewline.slice(2, 6).filter(item => item !== 'ถูกต้อง').join(', ') : uniqueFoundWithoutNewline.filter(item => item !== 'ถูกต้อง')) : 'ถูกต้อง'}`,
                "color": displayIsDuplicate == "สลิปซ้ำ" ? '#FF0000' : `${uniqueFoundWithoutNewline.length > 1 ? '#FF0000' : '#1DB446'}`,
                "size": "xs",
                "align": "end"
              },
            ]
          }
        ]
      },
      "styles": {
        "footer": {
          "separator": true
        },
      }
    }
  });

/*
  if (totalScore < 80) {
    await client.pushMessage(userId, {
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


async function replysave(client, imagenumber, event, imageIds, displayIsDuplicate, found, displayData, note, senandrecei, statussave, dateTime, imgUri) {
  try {
    var totalScore = calculateTotalScore(found);
    await client.replyMessage(event.replyToken, {
      type: 'flex',
      altText: 'ผลการตรวจสอบสลิป',
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
              "layout": "vertical",
              "margin" : "sm",
              "contents": [
                {
                  "type": "text",
                  "text": "สลิปมีข้อมูลที่ไม่ตรงโปรดตรวจสอบข้อมูลกับ",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 0
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
                      "flex": 0,
                      "action": {
                        "type": "uri",
                        "label": "action",
                        "uri": imgUri
                      }
                    },
                    {
                      "type": "text",
                      "text": "ก่อนการบันทึกข้อมูล",
                      "size": "sm",
                      "color": "#555555",
                      "flex": 0
                    },
                  ]
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
                  "text": displayIsDuplicate == "สลิปซ้ำ" ? 'สลิปนี้เคยถูกใช้งานแล้ว' : `${note.length > 1 ? (senandrecei ? 'ชื่อผู้ส่งและชื่อผู้รับเป็นภาษาอังกฤษจึงไม่สามารถตรวจสอบได้, ' + note.slice(2, 6).filter(item => item !== 'ถูกต้อง').join(', ') : note.filter(item => item !== 'ถูกต้อง')) : 'ถูกต้อง'}`,
                  "color": displayIsDuplicate == "สลิปซ้ำ" ? '#FF0000' : `${note.length > 1 ? '#FF0000' : '#1DB446'}`,
                  "size": "xs",
                  "align": "end"
                },
              ]
            },
            {
              "type": "separator",
              "margin": "xxl"
            },              
            {
              "type": 'box',
              "layout": 'horizontal',
              "margin": 'md',
              "contents": [
                {
                  "type": 'button',
                  "style": 'primary',
                  "color": '#1DB446',
                  "height": 'sm', 
                  "margin": 'sm', 
                  "action": {
                    "type": 'postback',
                    "label": 'บันทึก',
                    "data": "บันทึก" + `${imageIds}` + `${imagenumber}` 
                  }                
                },
                {
                  "type": 'button',
                  "style": 'primary',
                  "color": '#FF0000',
                  "height": 'sm', 
                  "margin": 'sm', 
                  "action": {
                    "type": 'postback',
                    "label": 'ไม่บันทึก',
                    "data": "ไม่บันทึก" + `${imageIds}` + `${imagenumber}` 
                  }
                }
              ]
            }                 
          ]
        },
        "styles": {
          "footer": {
            "separator": true
          },
        },
      }
    });
} catch (error) {
  await client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'ไม่สามารถที่จะอ่านข้อมูลได้โปรดถ่ายรูปไหมอีกครั้ง',
  });
}
}

// Export the function to make it accessible from other files
module.exports = {
  calculateTotalScore,
  sendFlexMessage,
  replysave,
};