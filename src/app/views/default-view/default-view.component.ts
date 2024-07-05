import { Component, OnInit } from '@angular/core';
import {AngContentComponent} from "../../components/ang-content/ang-content.component";

@Component({
  selector: 'default-view',
  templateUrl: './default-view.component.html',
  styleUrls: ['./default-view.component.css'],
  imports: [
    AngContentComponent
  ],
  standalone: true
})
export class DefaultViewComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {}

}
