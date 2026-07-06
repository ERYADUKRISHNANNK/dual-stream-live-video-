import { Schema, model } from "mongoose";
import { isDbOffline } from "../config/db";
import { MockFileDocument } from "./dbMock";

const FileDocumentSchema = new Schema(
  {
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    cid: { type: String, required: true, unique: true }, // IPFS Address
    fileHash: { type: String, required: true, unique: true, index: true }, // SHA-256 Hash
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ownerAddress: { type: String, required: true }, // Wallet Address
    threatScore: { type: Number, default: 0 },
    encryptedAesKey: { type: String, required: true }, // Wrapped key
    iv: { type: String, required: true }, // Initialization Vector
    digitalSignature: { type: String, required: true },
    blockchainTxHash: { type: String, default: "" },
    isLocked: { type: Boolean, default: false },
    isRecycled: { type: Boolean, default: false },
    selfDestruct: { type: Boolean, default: false }, // Delete immediately after download
    sharedWith: [
      {
        accessor: { type: Schema.Types.ObjectId, ref: "User" },
        accessorAddress: String,
        validUntil: Date,
        maxDownloads: Number,
        downloadCount: { type: Number, default: 0 }
      }
    ]
  },
  { timestamps: true }
);

const MongooseFile = model("FileDocument", FileDocumentSchema);

export const FileDocument = new Proxy(MongooseFile, {
  get(target, prop) {
    if (isDbOffline) {
      return (MockFileDocument as any)[prop];
    }
    return (target as any)[prop];
  }
}) as any;
