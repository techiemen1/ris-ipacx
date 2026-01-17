// services/hl7Service.js
const net = require("net");

exports.sendORU = async ({ patient, report }) => {
  const now = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);

  const message = [
    `MSH|^~\\&|RIS|HOSP|EMR|HOSP|${now}||ORU^R01|${Date.now()}|P|2.3`,
    `PID|||${patient.patient_id || ""}||${patient.patient_name || ""}`,
    `OBR|||${patient.accession_number || ""}||${patient.modality || ""}`,
    `OBX|||REPORT||${(report.content || "").replace(/\r?\n/g, "\\.br\\")}`,
  ].join("\r");

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(
      process.env.HL7_PORT || 2575,
      process.env.HL7_HOST || "127.0.0.1",
      () => {
        client.write(message);
        client.end();
        resolve(true);
      }
    );

    client.on("error", reject);
  });
};


