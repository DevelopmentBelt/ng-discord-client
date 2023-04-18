import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AngcordContentComponent } from './angcord-content.component';

describe('AngcordContentComponent', () => {
  let component: AngcordContentComponent;
  let fixture: ComponentFixture<AngcordContentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AngcordContentComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AngcordContentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
