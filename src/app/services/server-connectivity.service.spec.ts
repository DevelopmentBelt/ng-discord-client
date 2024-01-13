import { TestBed } from '@angular/core/testing';

import { ServerConnectivityService } from './server-connectivity.service';

describe('ServerConnectivityService', () => {
  let service: ServerConnectivityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServerConnectivityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
