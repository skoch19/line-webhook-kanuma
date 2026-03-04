import express from "express";

const app = express();
app.use(express.json());

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function replyMessage(replyToken, messages) {
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`
    },
    body: JSON.stringify({
      replyToken: replyToken,
      messages: messages,
      notificationDisabled: true
    })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("LINE API error:", res.status, err);
  }
}

app.get("/", (_req, res) => res.send("KANUMA webhook running"));

app.post("/webhook", (req, res) => {
  const events = req.body.events ?? [];
  res.status(200).end();
  Promise.all(events.map(handleEvent)).catch(err => console.error(err));
});

async function handleEvent(event) {
  if (event.type !== "postback") return;

  const data = event.postback.data;
  const replyToken = event.replyToken;

  // ① チェックイン開始
  if (data === "action=checkinStart") {
    return replyMessage(replyToken, [
      {
        type: "flex",
        altText: "チェックインのご案内",
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#8B3A2F",
            contents: [
              {
                type: "text",
                text: "チェックインのご案内",
                color: "#FFFFFF",
                weight: "bold",
                size: "lg",
                align: "center"
              }
            ]
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#8B3A2F",
                action: {
                  type: "uri",
                  label: "チェックインフォームの入力",
                  uri: "https://dive-hotels.com/login?redirect=/accounts/mypage&status=401"
                }
              },
              {
                type: "button",
                style: "secondary",
                action: {
                  type: "postback",
                  label: "入力済みの方はこちら",
                  data: "action=checkinComplete"
                }
              }
            ]
          }
        }
      }
    ]);
  }

  // ② 部屋タイプ選択
  else if (data === "action=checkinComplete") {
    return replyMessage(replyToken, [
      {
        type: "flex",
        altText: "お部屋タイプを選択してください",
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#8B3A2F",
            contents: [
              {
                type: "text",
                text: "お部屋タイプの選択",
                color: "#FFFFFF",
                weight: "bold",
                size: "lg",
                align: "center"
              }
            ]
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#8B3A2F",
                action: {
                  type: "postback",
                  label: "テント番号（1〜10）",
                  data: "action=selectRoomType&type=tent1"
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#8B3A2F",
                action: {
                  type: "postback",
                  label: "テント番号（11〜16）",
                  data: "action=selectRoomType&type=tent2"
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#5C4033",
                action: {
                  type: "postback",
                  label: "ログハウス（A・B・C）",
                  data: "action=selectRoomType&type=log"
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#1E3A8A",
                action: {
                  type: "postback",
                  label: "和室（1〜5）",
                  data: "action=selectRoomType&type=washitsu"
                }
              }
            ]
          }
        }
      }
    ]);
  }

  // ②-b 部屋番号カルーセル
  else if (data.startsWith("action=selectRoomType")) {
    const params = new URLSearchParams(data.split("&").slice(1).join("&"));
    const type = params.get("type");

    const roomMap = {
      tent1: Array.from({ length: 10 }, (_, i) => ({ name: `テント${i + 1}`, color: "#8B3A2F" })),
      tent2: Array.from({ length: 6 }, (_, i) => ({ name: `テント${i + 11}`, color: "#8B3A2F" })),
      log: [
        { name: "ログA", color: "#5C4033" },
        { name: "ログB", color: "#5C4033" },
        { name: "ログC", color: "#5C4033" }
      ],
      washitsu: [
        { name: "和室1", color: "#1E3A8A" },
        { name: "和室2", color: "#1E3A8A" },
        { name: "和室3", color: "#1E3A8A" },
        { name: "和室4", color: "#1E3A8A" },
        { name: "和室5", color: "#1E3A8A" }
      ]
    };

    const rooms = roomMap[type];
    const isTent = type === "tent1" || type === "tent2";

    return replyMessage(replyToken, [
      {
        type: "text",
        text: isTent
          ? "スクロール・タップしてください 👉"
          : "お部屋番号を選択してください 👇"
      },
      {
        type: "flex",
        altText: "部屋番号を選択してください",
        contents: {
          type: "carousel",
          contents: rooms.map(room => ({
            type: "bubble",
            size: "nano",
            body: {
              type: "box",
              layout: "vertical",
              backgroundColor: room.color,
              paddingAll: "10px",
              alignItems: "center",
              justifyContent: "center",
              action: {
                type: "postback",
                label: room.name,
                data: `action=selectDinner&room=${room.name}`
              },
              contents: [
                {
                  type: "text",
                  text: room.name,
                  weight: "bold",
                  size: "sm",
                  color: "#FFFFFF",
                  align: "center",
                  wrap: true
                }
              ]
            }
          }))
        }
      }
    ]);
  }

  // ③ 夕食時間選択
  else if (data.startsWith("action=selectDinner")) {
    const params = new URLSearchParams(data.split("&").slice(1).join("&"));
    const room = params.get("room");

    return replyMessage(replyToken, [
      {
        type: "text",
        text: `${room} で承りました。\n夕食のご希望時間を選択してください 👇`
      },
      {
        type: "flex",
        altText: "夕食時間を選択してください",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "夕食時間の選択",
                weight: "bold",
                size: "lg",
                align: "center",
                margin: "md"
              },
              ...[
                { label: "🍽️ 17:00*おすすめ*", time: "17:00" },
                { label: "🍽️ 17:30", time: "17:30" },
                { label: "🍽️ 18:00", time: "18:00" },
                { label: "🍽️ 18:30", time: "18:30" }
              ].map(item => ({
                type: "button",
                style: "secondary",
                margin: "sm",
                action: {
                  type: "postback",
                  label: item.label,
                  data: `action=confirm&room=${room}&time=${item.time}`
                }
              }))
            ]
          }
        }
      }
    ]);
  }

  // ④ 最終確定
  else if (data.startsWith("action=confirm")) {
    const params = new URLSearchParams(data.split("&").slice(1).join("&"));
    const time = params.get("time");
    const room = params.get("room");

    return replyMessage(replyToken, [
      {
        type: "flex",
        altText: "チェックイン完了",
        contents: {
          type: "bubble",
          header: {
            type: "box",
            layout: "vertical",
            backgroundColor: "#8B3A2F",
            contents: [
              {
                type: "text",
                text: "チェックイン完了 ✅",
                color: "#FFFFFF",
                weight: "bold",
                size: "lg",
                align: "center"
              }
            ]
          },
          body: {
            type: "box",
            layout: "vertical",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "お部屋番号", flex: 2, color: "#888888", size: "sm" },
                  { type: "text", text: room, flex: 3, weight: "bold", size: "sm" }
                ]
              },
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "夕食時間", flex: 2, color: "#888888", size: "sm" },
                  { type: "text", text: time, flex: 3, weight: "bold", size: "sm" }
                ]
              },
              { type: "separator" },
              {
                type: "text",
                text: "本日はごゆっくりお過ごしください。",
                wrap: true,
                size: "sm",
                align: "center",
                margin: "md"
              }
            ]
          }
        }
      }
    ]);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("KANUMA server started"));
