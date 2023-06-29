import { DatetimeFormatterPipe } from './datetime-formatter.pipe';

describe('DatetimeFormatterPipe', () => {
  it('create an instance', () => {
    const pipe = new DatetimeFormatterPipe();
    expect(pipe).toBeTruthy();
  });
});
