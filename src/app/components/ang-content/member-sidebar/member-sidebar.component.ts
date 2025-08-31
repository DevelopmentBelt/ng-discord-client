import {ChangeDetectionStrategy, Component, OnInit, signal, WritableSignal} from '@angular/core';
import {AvatarModule} from "primeng/avatar";
import {UserProfileModalComponent} from "../../user-profile-modal/user-profile-modal.component";
import {Member} from "../../../models/member/member";

@Component({
  selector: 'member-sidebar',
  templateUrl: './member-sidebar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvatarModule,
    UserProfileModalComponent
  ],
  standalone: true
})
export class MemberSidebarComponent implements OnInit {
  // Member data
  members: WritableSignal<Member[]> = signal([]);
  
  // User profile modal state
  selectedMember: WritableSignal<Member | null> = signal(null);
  isUserProfileModalOpen: WritableSignal<boolean> = signal(false);

  constructor() { }

  ngOnInit(): void {
    this.loadMockMembers();
  }

  /**
   * Load mock member data for development
   */
  loadMockMembers(): void {
    const mockMembers: Member[] = [
      {
        memberId: '1',
        memberName: 'Angel',
        userId: 1,
        username: 'angel',
        userPic: '',
        status: 'online',
        roles: ['Admin', 'Owner'],
        joinedAt: new Date('2024-01-01'),
        isOwner: true,
        isAdmin: true,
        canManageRoles: true,
        canManageMembers: true,
        canManageChannels: true
      },
      {
        memberId: '2',
        memberName: 'Badger',
        userId: 2,
        username: 'badger',
        userPic: 'https://avatars.githubusercontent.com/u/8027457',
        status: 'online',
        roles: ['Admin'],
        joinedAt: new Date('2024-01-15'),
        isOwner: false,
        isAdmin: true,
        canManageRoles: true,
        canManageMembers: true,
        canManageChannels: true
      },
      {
        memberId: '3',
        memberName: 'Charlie',
        userId: 3,
        username: 'charlie',
        userPic: '',
        status: 'offline',
        roles: ['Member'],
        joinedAt: new Date('2024-02-01'),
        isOwner: false,
        isAdmin: false,
        canManageRoles: false,
        canManageMembers: false,
        canManageChannels: false
      }
    ];
    
    this.members.set(mockMembers);
  }

  /**
   * Open user profile modal
   */
  openUserProfile(member: Member): void {
    this.selectedMember.set(member);
    this.isUserProfileModalOpen.set(true);
  }

  /**
   * Close user profile modal
   */
  closeUserProfileModal(): void {
    this.isUserProfileModalOpen.set(false);
    this.selectedMember.set(null);
  }

  /**
   * Get status color for member status indicator
   */
  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      'online': 'bg-green-500',
      'idle': 'bg-yellow-500',
      'dnd': 'bg-red-500',
      'offline': 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  /**
   * Get filtered members by status
   */
  getOnlineMembers(): Member[] {
    return this.members().filter(member => member.status !== 'offline');
  }

  getOfflineMembers(): Member[] {
    return this.members().filter(member => member.status === 'offline');
  }
}
