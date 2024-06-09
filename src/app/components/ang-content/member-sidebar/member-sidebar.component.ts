import {ChangeDetectionStrategy, Component, OnInit} from '@angular/core';

@Component({
  selector: 'member-sidebar',
  templateUrl: './member-sidebar.component.html',
  styleUrls: ['./member-sidebar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberSidebarComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

}
