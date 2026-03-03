import express from "express";
import { Client } from "@line/bot-sdk";

const app = express();
app.use(express.json());

const client = new Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

app.get("/", (_req, res) => res.send("KANUMA webhook running"));

app.post("/webhook", async (req, res) => {
  const events = req.body.events;

  for (const event of events) {
    if (event.type !== "postback") continue;

    const data = event.postback.data;

    // =========================
    // ① チェックイン開始
    // =========================
    if (data === "action=checkinStart") {
      await client.replyMessage(
        event.replyToken,
        {
          type: "template",
          altText: "チェックイン",
          template: {
            type: "buttons",
            title: "チェックインのご案内",
            text: "宿泊名簿のご記入状況を選択してください。",
            actions: [
              {
                type: "uri",
                label: "宿泊名簿を記入する",
                uri: "https://docs.google.com/forms/d/1qQ7ijwB7mOkB6U0eDP49Ddp5OqFpwV7GyYI6QjjEPAE/edit"
              },
              {
                type: "postback",
                label: "記入済み",
                data: "action=checkinComplete"
              }
            ]
          }
        },
        { notificationDisabled: true }
      );
    }

    // =========================
    // ② 夕食時間選択
    // =========================
    else if (data === "action=checkinComplete") {
      await client.replyMessage(
        event.replyToken,
        {
          type: "template",
          altText: "夕食時間選択",
          template: {
            type: "buttons",
            title: "夕食時間の選択",
            text: "ご希望の時間を選択してください",
            actions: [
              { type: "postback", label: "17:30", data: "action=dinner&time=17:30" },
              { type: "postback", label: "18:00", data: "action=dinner&time=18:00" },
              { type: "postback", label: "18:30", data: "action=dinner&time=18:30" },
              { type: "postback", label: "19:00", data: "action=dinner&time=19:00" }
            ]
          }
        },
        { notificationDisabled: true }
      );
    }

    // =========================
    // ③ 部屋番号Flex表示
    // =========================
    else if (data.startsWith("action=dinner")) {
      const params = new URLSearchParams(data.split("&").slice(1).join("&"));
      const selectedTime = params.get("time");

      const rooms = [
        ...Array.from({ length: 16 }, (_, i) => ({
          name: `${i + 1}`,
          color: "#4CAF50"
        })),
        { name: "ログA", color: "#8B4513" },
        { name: "ログB", color: "#8B4513" },
        { name: "ログC", color: "#8B4513" },
        { name: "和室1", color: "#1E3A8A" },
        { name: "和室2", color: "#1E3A8A" },
        { name: "和室3", color: "#1E3A8A" },
        { name: "和室4", color: "#1E3A8A" },
        { name: "和室5", color: "#1E3A8A" }
      ];

      const flexContents = {
        type: "carousel",
        contents: rooms.map(room => ({
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            backgroundColor: room.color,
            contents: [
              {
                type: "text",
                text: `部屋 ${room.name}`,
                weight: "bold",
                size: "xl",
                color: "#FFFFFF",
                align: "center"
              }
            ],
            paddingAll: "40px",
            alignItems: "center",
            justifyContent: "center"
          },
          footer: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "button",
                style: "primary",
                action: {
                  type: "postback",
                  label: "この部屋にする",
                  data: `action=confirm&time=${selectedTime}&room=${room.name}`
                }
              }
            ]
          }
        }))
      };

      await client.replyMessage(
        event.replyToken,
        {
          type: "flex",
          altText: "部屋番号を選択してください",
          contents: flexContents
        },
        { notificationDisabled: true }
      );
    }

    // =========================
    // ④ 最終確定
    // =========================
    else if (data.startsWith("action=confirm")) {
      const params = new URLSearchParams(data.split("&").slice(1).join("&"));
      const time = params.get("time");
      const room = params.get("room");

      await client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text:
            `チェックインが完了しました。\n\n` +
            `部屋番号：${room}\n` +
            `夕食時間：${time}\n\n` +
            `本日はごゆっくりお過ごしください。`
        },
        { notificationDisabled: true }
      );
    }
  }

  res.status(200).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("KANUMA server started"));
