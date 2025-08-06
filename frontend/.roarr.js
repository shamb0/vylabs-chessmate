const { DateTime } = require('luxon');

/**
 * @type {import('@roarr/cli').RoarrConfiguration}
 */
module.exports = {
  format: (message) => {
    const data = JSON.parse(message);
    // Format the timestamp to IST
    data.time = DateTime.fromMillis(data.time, { zone: 'utc' })
      .setZone('Asia/Kolkata')
      .toFormat('yyyy-LL-dd HH:mm:ss');
    
    // Re-serialize the message with the new timestamp format
    return JSON.stringify(data);
  },
};
