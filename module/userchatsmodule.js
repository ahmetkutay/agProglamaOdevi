function CommonModule() {
  var senderId;
  var receiverId;
  return {
    init: function (senderID, receiverID) {
      senderId = senderID;
      receiverId = receiverID;
    },
    getSender: function () {
      return senderId;
    },
    getReceiver: function () {
      return receiverId;
    },
  };
}

module.exports = CommonModule;
