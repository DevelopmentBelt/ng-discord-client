import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngContentComponent } from './ang-content.component';

describe('AngContentComponent', () => {
  let component: AngContentComponent;
  let fixture: ComponentFixture<AngContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AngContentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AngContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
