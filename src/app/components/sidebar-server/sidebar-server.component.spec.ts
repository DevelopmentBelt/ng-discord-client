import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarServerComponent } from './sidebar-server.component';

describe('SidebarServerComponent', () => {
  let component: SidebarServerComponent;
  let fixture: ComponentFixture<SidebarServerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SidebarServerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarServerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
