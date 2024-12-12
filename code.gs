function doGet(e) {
  // ★ここにあらかじめランダムに生成したAPIキーを記載してください
  // 例: const VALID_API_KEY = "m8w2H0bJYqQ3x7ZpR9K4T";
  const VALID_API_KEY = "YOUR_VALID_API_KEY";

  var result = {};

  try {
    // APIキーのチェック
    var inputKey = e.parameter.apiKey;
    if (!inputKey || inputKey !== VALID_API_KEY) {
      throw new Error("Invalid or missing API key");
    }

    var action = e.parameter.action;
    switch (action) {
      case 'search':
        // gmail_search_messages に対応
        if (!e.parameter.query) throw new Error("query parameter is required");
        var threads = GmailApp.search(e.parameter.query);
        var messagesData = [];
        for (var i = 0; i < threads.length; i++) {
          var msgs = threads[i].getMessages();
          for (var j = 0; j < msgs.length; j++) {
            var msg = msgs[j];
            messagesData.push({
              messageId: msg.getId(),
              subject: msg.getSubject(),
              from: msg.getFrom(),
              to: msg.getTo(),
              date: msg.getDate(),
              isRead: !msg.isUnread()
            });
          }
        }
        result = { status: 'ok', messages: messagesData };
        break;

      case 'getMessage':
        // gmail_get_message に対応
        if (!e.parameter.messageId) throw new Error("messageId parameter is required");
        var message = GmailApp.getMessageById(e.parameter.messageId);
        if (!message) throw new Error("Message not found for the given messageId");

        var attachmentsInfo = message.getAttachments().map(function(att) {
          return {
            name: att.getName(),
            contentType: att.getContentType(),
            size: att.getBytes().length
          };
        });
        result = {
          status: 'ok',
          message: {
            messageId: message.getId(),
            subject: message.getSubject(),
            from: message.getFrom(),
            to: message.getTo(),
            cc: message.getCc(),
            bcc: message.getBcc(),
            date: message.getDate(),
            body: message.getPlainBody(),
            isRead: !message.isUnread(),
            attachments: attachmentsInfo
          }
        };
        break;

      case 'markRead':
        // gmail_mark_read に対応
        if (!e.parameter.messageId) throw new Error("messageId parameter is required");
        var msgRead = GmailApp.getMessageById(e.parameter.messageId);
        if (!msgRead) throw new Error("Message not found for the given messageId");
        msgRead.markRead();
        result = {
          status: 'ok',
          message: 'marked as read',
          messageId: e.parameter.messageId
        };
        break;

      case 'markUnread':
        // gmail_mark_unread に対応
        if (!e.parameter.messageId) throw new Error("messageId parameter is required");
        var msgUnread = GmailApp.getMessageById(e.parameter.messageId);
        if (!msgUnread) throw new Error("Message not found for the given messageId");
        msgUnread.markUnread();
        result = {
          status: 'ok',
          message: 'marked as unread',
          messageId: e.parameter.messageId
        };
        break;

      case 'moveToLabel':
        // gmail_move_to_label に対応
        if (!e.parameter.messageId) throw new Error("messageId parameter is required");
        if (!e.parameter.labelName) throw new Error("labelName parameter is required");
        var msgLabel = GmailApp.getMessageById(e.parameter.messageId);
        if (!msgLabel) throw new Error("Message not found for the given messageId");
        var thread = msgLabel.getThread();
        var label = GmailApp.getUserLabelByName(e.parameter.labelName);
        if (!label) {
          label = GmailApp.createLabel(e.parameter.labelName);
        }
        thread.addLabel(label);
        result = {
          status: 'ok',
          message: 'moved to label',
          messageId: e.parameter.messageId,
          labelName: e.parameter.labelName
        };
        break;

      case 'downloadAttachment':
        // gmail_download_attachment に対応
        if (!e.parameter.messageId) throw new Error("messageId parameter is required");
        if (!e.parameter.attachmentId) throw new Error("attachmentId parameter is required");
        var msgAttach = GmailApp.getMessageById(e.parameter.messageId);
        if (!msgAttach) throw new Error("Message not found for the given messageId");
        var attachments = msgAttach.getAttachments();
        var attachmentData = null;

        for (var k = 0; k < attachments.length; k++) {
          if (attachments[k].getName() === e.parameter.attachmentId) {
            var blob = attachments[k].copyBlob();
            var base64Data = Utilities.base64Encode(blob.getBytes());
            attachmentData = {
              name: attachments[k].getName(),
              contentType: attachments[k].getContentType(),
              size: attachments[k].getBytes().length,
              base64: base64Data
            };
            break;
          }
        }

        if (!attachmentData) {
          throw new Error("Attachment not found with the given attachmentId");
        }

        result = {
          status: 'ok',
          attachment: attachmentData
        };
        break;

      default:
        throw new Error("Unknown action: " + action);
    }

  } catch (err) {
    result = {
      status: 'error',
      message: err.message
    };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result, null, 2))
    .setMimeType(ContentService.MimeType.JSON);
}
