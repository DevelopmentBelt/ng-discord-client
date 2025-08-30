import {ChangeDetectionStrategy, Component, EventEmitter, OnInit, Output, signal, WritableSignal} from '@angular/core';
import {SidebarServerComponent} from "../sidebar-server/sidebar-server.component";
import {NgClass} from "@angular/common";
import {Server} from "../../models/server/server";
import {ServerCreationModalComponent} from "../server-creation-modal/server-creation-modal.component";
import {NewServerData} from "../server-creation-modal/server-creation-modal.component";

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',

  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SidebarServerComponent,
    NgClass,
    ServerCreationModalComponent
  ],
  standalone: true
})
export class SidebarComponent implements OnInit {
  public selectedServerId: WritableSignal<string> = signal('952934994085568552');
  @Output() public selectedServerChange: EventEmitter<Server> = new EventEmitter<Server>();
  
  // Modal visibility state
  showServerCreation: WritableSignal<boolean> = signal(false);

  // TODO Change to an input
  public sidebarServers: Server[] = [
    {
      iconURL: 'https://i.gyazo.com/abe61b99e892258fd30fccb500a86579.png',
      serverName: 'CollectiveM',
      serverId: '952934994085568552',
      ownerId: '394446211341615104',
      serverDescription: 'CollectiveM is a 18+ age restricted FiveM community that was started by Badger along with some of his old buddies from his past roleplaying servers he has ran. Unfortunately, these old buddies backed out of the project as soon as it was started. Never fear though, Badger plans to build up this community and make it the most realistic roleplaying experience one can encounter within FiveM.'
    },
    {
      iconURL: 'https://avatars.githubusercontent.com/u/8027457',
      serverName: "Badger's Dev Community",
      serverId: '932655785190764564',
      ownerId: '394446211341615104',
      serverDescription: 'I started Badger\'s Developer Community back in July of 2019. It\'s been a thing for quite a while and I have helped many people within it to fix their problems with my scripts and/or other scripts. We are a community with multiple developers and players of FiveM, as well as other software and other games. Many of us look forward to helping each other as we believe "You help me, I help you" type of philosophy. If you ever need help, don\'t be afraid to ask for it!'
    },
    {
      iconURL: 'https://pbs.twimg.com/profile_images/1193274446892666880/c39OPO6z_400x400.jpg',
      serverName: "FSG-Nation",
      serverId: '127170774103621632',
      ownerId: '127165469625942016',
      serverDescription: 'The father & son duo that play games and streams together!'
    }
  ];

  constructor() {}

  ngOnInit(): void {
    this.selectServer(this.sidebarServers[0]) // Default to first server id on init...
  }

  selectServer(server: Server) {
    this.selectedServerId.set(server.serverId);
    this.selectedServerChange.emit(server);
  }

  selectHome() {
    const homeServer: Server = {
      serverId: 'home',
      serverName: 'Home',
      iconURL: '',
      ownerId: '',
      serverDescription: 'Home server'
    };
    this.selectServer(homeServer);
  }

  addServer() {
    this.showServerCreation.set(true);
  }

  exploreServers() {
    // TODO: Implement explore servers functionality
    console.log('Explore servers clicked');
  }
  
  /**
   * Close server creation modal
   */
  closeServerCreation(): void {
    this.showServerCreation.set(false);
  }
  
  /**
   * Handle server creation
   */
  onServerCreated(serverData: NewServerData): void {
    // TODO: Implement actual server creation with backend API
    console.log('Server created:', serverData);
    
    // For now, create a mock server and add it to the list
    const newServer: Server = {
      serverId: Math.random().toString(36).substring(2, 15),
      serverName: serverData.serverName,
      serverDescription: serverData.serverDescription,
      iconURL: serverData.serverIcon ? URL.createObjectURL(serverData.serverIcon) : '',
      ownerId: 'current-user-id' // TODO: Get actual user ID
    };
    
    this.sidebarServers.push(newServer);
    
    // Close the modal
    this.closeServerCreation();
  }
}
