import { describe, it } from "node:test";
import assert from "node:assert";
import { setHours, setMinutes, startOfDay, addMinutes } from "date-fns";
import {
  durationToMinutes,
  parseTimeOnDate,
  generateSlotsForDate,
  type TimeslotConfig,
} from "./timeslot-generator";

const date = new Date("2026-02-10"); // Tuesday

describe("durationToMinutes", () => {
  it("converts MINUTES to minutes", () => {
    assert.strictEqual(durationToMinutes(30, "MINUTES"), 30);
  });
  it("converts HOURS to minutes", () => {
    assert.strictEqual(durationToMinutes(2, "HOURS"), 120);
  });
  it("converts DAYS to minutes", () => {
    assert.strictEqual(durationToMinutes(1, "DAYS"), 24 * 60);
  });
  it("converts NIGHTS to minutes", () => {
    assert.strictEqual(durationToMinutes(2, "NIGHTS"), 2 * 24 * 60);
  });
});

describe("parseTimeOnDate", () => {
  it("parses HH:mm on given date", () => {
    const result = parseTimeOnDate(date, "14:30");
    assert.strictEqual(result.getHours(), 14);
    assert.strictEqual(result.getMinutes(), 30);
    assert.strictEqual(result.getDate(), date.getDate());
  });
});

describe("generateSlotsForDate", () => {
  it("returns same-day slots with buffer", () => {
    const config: TimeslotConfig = {
      durationValue: 2,
      durationUnit: "HOURS",
      startTime: "09:00",
      endTime: "17:00",
      bufferMinutes: 60,
    };
    const slots = generateSlotsForDate(config, date);
    // 9-11, buffer 1h, 12-14, buffer 1h, 15-17 => 3 slots
    assert.strictEqual(slots.length, 3);
    assert.strictEqual(slots[0].start.getHours(), 9);
    assert.strictEqual(slots[0].end.getHours(), 11);
    assert.strictEqual(slots[1].start.getHours(), 12);
    assert.strictEqual(slots[2].start.getHours(), 15);
  });

  it("clips to operating window", () => {
    const config: TimeslotConfig = {
      durationValue: 1,
      durationUnit: "HOURS",
      startTime: "13:00",
      endTime: "16:00",
      bufferMinutes: 0,
    };
    const slots = generateSlotsForDate(config, date);
    assert.strictEqual(slots.length, 3); // 13-14, 14-15, 15-16
    assert.strictEqual(slots[0].start.getHours(), 13);
    assert.strictEqual(slots[2].end.getHours(), 16);
  });

  it("respects minStartTime", () => {
    const config: TimeslotConfig = {
      durationValue: 1,
      durationUnit: "HOURS",
      startTime: "09:00",
      endTime: "17:00",
      bufferMinutes: 0,
    };
    const minStart = setHours(setMinutes(startOfDay(date), 30), 11); // 11:30
    const slots = generateSlotsForDate(config, date, minStart);
    assert.ok(slots.length >= 1);
    assert.strictEqual(slots[0].start.getHours(), 11);
    assert.strictEqual(slots[0].start.getMinutes(), 30);
  });

  it("returns one slot per day for long duration (24h+)", () => {
    const config: TimeslotConfig = {
      durationValue: 1,
      durationUnit: "DAYS",
      startTime: "09:00",
      endTime: "17:00",
      bufferMinutes: 0,
    };
    const slots = generateSlotsForDate(config, date);
    assert.strictEqual(slots.length, 1);
    assert.strictEqual(slots[0].start.getHours(), 9);
    const endNextDay = addMinutes(slots[0].start, 24 * 60);
    assert.strictEqual(slots[0].end.getDate(), endNextDay.getDate());
  });

  it("returns one slot when allowMultipleDays is true", () => {
    const config: TimeslotConfig = {
      durationValue: 3,
      durationUnit: "HOURS",
      startTime: "10:00",
      endTime: "18:00",
      bufferMinutes: 0,
      allowMultipleDays: true,
    };
    const slots = generateSlotsForDate(config, date);
    assert.strictEqual(slots.length, 1);
    assert.strictEqual(slots[0].start.getHours(), 10);
    assert.strictEqual(slots[0].end.getHours(), 13);
  });

  it("returns empty when duration is 0", () => {
    const config: TimeslotConfig = {
      durationValue: 0,
      durationUnit: "HOURS",
      startTime: "09:00",
      endTime: "17:00",
    };
    const slots = generateSlotsForDate(config, date);
    assert.strictEqual(slots.length, 0);
  });

  it("returns one overnight slot when duration >= 12h and end before start (e.g. 6pm-12pm, 18hr)", () => {
    const config: TimeslotConfig = {
      durationValue: 18,
      durationUnit: "HOURS",
      startTime: "18:00",
      endTime: "12:00",
      bufferMinutes: 0,
      allowMultipleDays: false,
    };
    const slots = generateSlotsForDate(config, date);
    assert.strictEqual(slots.length, 1);
    assert.strictEqual(slots[0].start.getHours(), 18);
    assert.strictEqual(slots[0].start.getMinutes(), 0);
    const endDate = slots[0].end;
    assert.strictEqual(endDate.getHours(), 12);
    assert.strictEqual(endDate.getDate(), date.getDate() + 1);
  });

  it("uses default window when operating times not set", () => {
    const config: TimeslotConfig = {
      durationValue: 1,
      durationUnit: "HOURS",
      bufferMinutes: 0,
    };
    const slots = generateSlotsForDate(config, date);
    assert.ok(slots.length >= 1);
    assert.strictEqual(slots[0].start.getHours(), 9);
    assert.strictEqual(slots[0].end.getHours(), 10);
  });
});
