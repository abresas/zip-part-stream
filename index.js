// Generated by CoffeeScript 1.10.0
(function() {
  var CombinedStream, DEFLATE_END, DeflateCRC32Stream, DeflatePartStream, ZIP_CD_DISK_START, ZIP_CD_EXTERNAL_ATT, ZIP_CD_EXTRAFIELD_LEN, ZIP_CD_FILE_COMM_LEN, ZIP_CD_INTERNAL_ATT, ZIP_CD_SIGNATURE, ZIP_CD_VERSION, ZIP_COMPRESSION_DEFLATE, ZIP_ECD_COMM_LEN, ZIP_ECD_DISK_NUM, ZIP_ECD_SIGNATURE, ZIP_ECD_SIZE, ZIP_ENTRY_EXTRAFIELD_LEN, ZIP_ENTRY_SIGNATURE, ZIP_FLAGS, ZIP_VERSION, centralDirectoryLength, crcUtils, create, createCDRecord, createEndOfCDRecord, createEntry, createFileHeader, dosFormatDate, dosFormatTime, fileHeaderLength, getCombinedCrc, iob, totalLength,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  crcUtils = require('resin-crc-utils');

  CombinedStream = require('combined-stream2');

  DeflateCRC32Stream = require('crc32-stream').DeflateCRC32Stream;

  ZIP_VERSION = new Buffer([0x0a, 0x00]);

  ZIP_FLAGS = new Buffer([0x00, 0x00]);

  ZIP_ENTRY_SIGNATURE = new Buffer([0x50, 0x4b, 0x03, 0x04]);

  ZIP_ENTRY_EXTRAFIELD_LEN = new Buffer([0x00, 0x00]);

  ZIP_COMPRESSION_DEFLATE = new Buffer([0x08, 0x00]);

  ZIP_CD_SIGNATURE = new Buffer([0x50, 0x4b, 0x01, 0x02]);

  ZIP_CD_VERSION = new Buffer([0x1e, 0x03]);

  ZIP_CD_FILE_COMM_LEN = new Buffer([0x00, 0x00]);

  ZIP_CD_DISK_START = new Buffer([0x00, 0x00]);

  ZIP_CD_INTERNAL_ATT = new Buffer([0x01, 0x00]);

  ZIP_CD_EXTERNAL_ATT = new Buffer([0x00, 0x00, 0xa4, 0x81]);

  ZIP_CD_EXTRAFIELD_LEN = new Buffer([0x00, 0x00]);

  ZIP_ECD_SIGNATURE = new Buffer([0x50, 0x4b, 0x05, 0x06]);

  ZIP_ECD_DISK_NUM = new Buffer([0x00, 0x00]);

  ZIP_ECD_COMM_LEN = new Buffer([0x00, 0x00]);

  ZIP_ECD_SIZE = 22;

  DEFLATE_END = new Buffer([0x03, 0x00]);

  DeflatePartStream = (function(superClass) {
    extend(DeflatePartStream, superClass);

    function DeflatePartStream() {
      this.buf = new Buffer(0);
      DeflatePartStream.__super__.constructor.apply(this, arguments);
    }

    DeflatePartStream.prototype.push = function(chunk) {
      if (chunk !== null) {
        DeflatePartStream.__super__.push.call(this, this.buf);
        return this.buf = chunk;
      } else {
        if (this.buf.length >= 2 && this.buf.slice(-2).equals(DEFLATE_END)) {
          this.buf = this.buf.slice(0, -2);
        }
        DeflatePartStream.__super__.push.call(this, this.buf);
        return DeflatePartStream.__super__.push.call(this, null);
      }
    };

    DeflatePartStream.prototype.end = function() {
      return this.flush((function(_this) {
        return function() {
          return DeflatePartStream.__super__.end.call(_this);
        };
      })(this));
    };

    DeflatePartStream.prototype.metadata = function() {
      return {
        crc: this.digest(),
        len: this.size(),
        zLen: this.size(true)
      };
    };

    return DeflatePartStream;

  })(DeflateCRC32Stream);

  exports.createDeflatePart = function() {
    return new DeflatePartStream();
  };

  fileHeaderLength = function(filename) {
    return 30 + filename.length;
  };

  centralDirectoryLength = function(filename) {
    return 0x2e + filename.length;
  };

  iob = function(number, size) {
    var b;
    b = new Buffer(size);
    b.fill(0).writeUIntLE(number, 0, size);
    return b;
  };

  createFileHeader = function(arg) {
    var compressed_size, crc, filename, mdate, mtime, uncompressed_size;
    filename = arg.filename, compressed_size = arg.compressed_size, uncompressed_size = arg.uncompressed_size, crc = arg.crc, mtime = arg.mtime, mdate = arg.mdate;
    return Buffer.concat([ZIP_ENTRY_SIGNATURE, ZIP_VERSION, ZIP_FLAGS, ZIP_COMPRESSION_DEFLATE, mtime, mdate, crc, iob(compressed_size, 4), iob(uncompressed_size, 4), iob(filename.length, 2), ZIP_ENTRY_EXTRAFIELD_LEN, new Buffer(filename)]);
  };

  createCDRecord = function(arg, fileHeaderOffset) {
    var compressed_size, crc, filename, mdate, mtime, uncompressed_size;
    filename = arg.filename, compressed_size = arg.compressed_size, uncompressed_size = arg.uncompressed_size, crc = arg.crc, mtime = arg.mtime, mdate = arg.mdate;
    return Buffer.concat([ZIP_CD_SIGNATURE, ZIP_CD_VERSION, ZIP_VERSION, ZIP_FLAGS, ZIP_COMPRESSION_DEFLATE, mtime, mdate, crc, iob(compressed_size, 4), iob(uncompressed_size, 4), iob(filename.length, 2), ZIP_ENTRY_EXTRAFIELD_LEN, ZIP_CD_FILE_COMM_LEN, ZIP_CD_DISK_START, ZIP_CD_INTERNAL_ATT, ZIP_CD_EXTERNAL_ATT, iob(fileHeaderOffset, 4), new Buffer(filename)]);
  };

  createEndOfCDRecord = function(entries) {
    var cd_offset, cd_size;
    cd_offset = entries.reduce((function(sum, x) {
      return sum + fileHeaderLength(x.filename) + x.compressed_size;
    }), 0);
    cd_size = entries.reduce((function(sum, x) {
      return sum + centralDirectoryLength(x.filename);
    }), 0);
    return Buffer.concat([ZIP_ECD_SIGNATURE, ZIP_ECD_DISK_NUM, ZIP_CD_DISK_START, iob(entries.length, 2), iob(entries.length, 2), iob(cd_size, 4), iob(cd_offset, 4), ZIP_ECD_COMM_LEN]);
  };

  dosFormatTime = function(d) {
    var buf;
    buf = new Buffer(2);
    buf.writeUIntLE((d.getSeconds() / 2) + (d.getMinutes() << 5) + (d.getHours() << 11), 0, 2);
    return buf;
  };

  dosFormatDate = function(d) {
    var buf;
    buf = new Buffer(2);
    buf.writeUIntLE(d.getDate() + ((d.getMonth() + 1) << 5) + ((d.getFullYear() - 1980) << 9), 0, 2);
    return buf;
  };

  getCombinedCrc = function(parts) {
    var buf;
    if (parts.length === 1) {
      buf = new Buffer(4);
      buf.writeUInt32LE(parts[0].crc, 0, 4);
      return buf;
    } else {
      return crcUtils.crc32_combine_multi(parts).combinedCrc32.slice(0, 4);
    }
  };

  exports.totalLength = totalLength = function(entries) {
    return ZIP_ECD_SIZE + entries.reduce((function(sum, x) {
      return sum + x.zLen;
    }), 0);
  };

  exports.createEntry = createEntry = function(filename, parts, mdate) {
    var compressed_size, contentLength, entry, i, len, stream, uncompressed_size;
    if (mdate == null) {
      mdate = new Date();
    }
    compressed_size = parts.reduce((function(sum, x) {
      return sum + x.zLen;
    }), DEFLATE_END.length);
    uncompressed_size = parts.reduce((function(sum, x) {
      return sum + x.len;
    }), 0);
    contentLength = fileHeaderLength(filename) + compressed_size;
    entry = {
      filename: filename,
      compressed_size: compressed_size,
      uncompressed_size: uncompressed_size,
      crc: getCombinedCrc(parts),
      mtime: dosFormatTime(mdate),
      mdate: dosFormatDate(mdate),
      contentLength: contentLength,
      zLen: contentLength + centralDirectoryLength(filename),
      stream: CombinedStream.create()
    };
    entry.stream.append(createFileHeader(entry));
    for (i = 0, len = parts.length; i < len; i++) {
      stream = parts[i].stream;
      entry.stream.append(stream);
    }
    entry.stream.append(DEFLATE_END);
    return entry;
  };

  exports.create = create = function(entries) {
    var entry, i, j, len, len1, offset, out;
    offset = 0;
    out = CombinedStream.create();
    for (i = 0, len = entries.length; i < len; i++) {
      entry = entries[i];
      out.append(entry.stream);
    }
    for (j = 0, len1 = entries.length; j < len1; j++) {
      entry = entries[j];
      out.append(createCDRecord(entry, offset += entry.contentLength));
    }
    out.append(createEndOfCDRecord(entries));
    out.zLen = totalLength(entries);
    return out;
  };

  exports.createZip = function(filename, parts, mdate) {
    var entry;
    entry = createEntry(filename, parts, mdate);
    return create([entry]);
  };

}).call(this);
