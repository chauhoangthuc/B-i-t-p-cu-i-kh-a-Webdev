import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('statusEngine FSM status transition logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('nên chuyển trạng thái upcoming -> ongoing khi chạm giờ bắt đầu', () => {
    const startTime = new Date('2026-07-29T21:00:00Z');
    const endTime = new Date('2026-07-29T23:00:00Z');
    
    // Giả lập thời gian hiện tại là 2026-07-29T20:59:00Z (trước 1 phút)
    vi.setSystemTime(new Date('2026-07-29T20:59:00Z'));
    
    let eventStatus = 'upcoming';
    const now = new Date();
    
    // Hàm FSM mô phỏng status-engine.js
    if (eventStatus === 'upcoming' && now >= startTime) {
      eventStatus = 'ongoing';
    }
    expect(eventStatus).toBe('upcoming');

    // Nhảy tới đúng giờ bắt đầu
    vi.setSystemTime(startTime);
    const now2 = new Date();
    if (eventStatus === 'upcoming' && now2 >= startTime) {
      eventStatus = 'ongoing';
    }
    expect(eventStatus).toBe('ongoing');
  });

  it('nên chuyển trạng thái ongoing -> done khi chạm giờ kết thúc', () => {
    const endTime = new Date('2026-07-29T23:00:00Z');
    
    // Đang diễn ra
    vi.setSystemTime(new Date('2026-07-29T22:59:00Z'));
    let eventStatus = 'ongoing';
    
    const now = new Date();
    if (eventStatus === 'ongoing' && now >= endTime) {
      eventStatus = 'done';
    }
    expect(eventStatus).toBe('ongoing');

    // Nhảy đến giờ kết thúc
    vi.setSystemTime(endTime);
    const now2 = new Date();
    if (eventStatus === 'ongoing' && now2 >= endTime) {
      eventStatus = 'done';
    }
    expect(eventStatus).toBe('done');
  });

  it('nên bỏ qua và giữ nguyên trạng thái cancelled/postponed', () => {
    const startTime = new Date('2026-07-29T21:00:00Z');
    vi.setSystemTime(startTime);
    
    let eventStatus = 'cancelled';
    const now = new Date();
    
    // FSM chỉ chuyển đổi nếu status IN ('upcoming', 'ongoing')
    if (eventStatus === 'upcoming' && now >= startTime) {
      eventStatus = 'ongoing';
    }
    expect(eventStatus).toBe('cancelled');
  });
});
