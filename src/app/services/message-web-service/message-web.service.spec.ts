import { TestBed } from '@angular/core/testing';

import { MessageWebService } from './message-web.service';

describe('WebService', () => {
  let service: MessageWebService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageWebService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
