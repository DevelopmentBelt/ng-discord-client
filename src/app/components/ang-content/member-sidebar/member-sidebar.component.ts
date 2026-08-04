import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  effect,
  input,
  signal,
  WritableSignal
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AvatarModule } from 'primeng/avatar';
import { UserProfileModalComponent } from '../../user-profile-modal/user-profile-modal.component';
import { Member } from '../../../models/member/member';
import { Server } from '../../../models/server/server';
import { ServerWebService } from '../../../services/server-web-service/server-web.service';
import { AuthService } from '../../../services/auth-service/auth.service';

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
export class MemberSidebarComponent implements OnDestroy {
  server = input<Server | null>(null);

  members: WritableSignal<Member[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  loadError: WritableSignal<string> = signal('');

  selectedMember: WritableSignal<Member | null> = signal(null);
  isUserProfileModalOpen: WritableSignal<boolean> = signal(false);

  private subs = new Subscription();

  constructor(
    private serverWebService: ServerWebService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    effect(() => {
      const server = this.server();
      this.subs.unsubscribe();
      this.subs = new Subscription();
      this.members.set([]);
      this.loadError.set('');

      if (!server?.serverId || server.serverId === 'home') {
        this.isLoading.set(false);
        this.cdr.markForCheck();
        return;
      }

      this.isLoading.set(true);
      this.subs.add(
        this.serverWebService.getServerMembers(String(server.serverId)).subscribe({
          next: (members) => {
            const list = Array.isArray(members) ? members : [];
            this.members.set(this.ensureCurrentUserListed(list.map((member) => this.normalizeMember(member)), server));
            this.isLoading.set(false);
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Failed to load server members:', error);
            // Still show the signed-in user so the list is never empty for a joined server
            const fallback = this.ensureCurrentUserListed([], server);
            this.members.set(fallback);
            this.loadError.set(fallback.length ? '' : (error?.error?.error || 'Failed to load members'));
            this.isLoading.set(false);
            this.cdr.markForCheck();
          }
        })
      );
    }, { allowSignalWrites: true });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  openUserProfile(member: Member): void {
    this.selectedMember.set(member);
    this.isUserProfileModalOpen.set(true);
  }

  closeUserProfileModal(): void {
    this.isUserProfileModalOpen.set(false);
    this.selectedMember.set(null);
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      online: 'bg-green-500',
      idle: 'bg-yellow-500',
      dnd: 'bg-red-500',
      offline: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  }

  getOnlineMembers(): Member[] {
    return this.members().filter((member) => member.status !== 'offline');
  }

  getOfflineMembers(): Member[] {
    return this.members().filter((member) => member.status === 'offline');
  }

  roleLabel(member: Member): string {
    return (member.roles || []).join(', ');
  }

  private ensureCurrentUserListed(members: Member[], server: Server): Member[] {
    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      return members;
    }

    if (members.some((member) => Number(member.userId) === Number(currentUser.id))) {
      return members;
    }

    const isOwner = String(server.ownerId) === String(currentUser.id);
    const selfMember: Member = {
      memberId: `self-${currentUser.id}`,
      memberName: currentUser.username,
      userId: currentUser.id,
      username: currentUser.username,
      userPic: currentUser.userPic || '',
      status: 'online',
      roles: isOwner ? ['Owner'] : ['Member'],
      joinedAt: new Date(),
      isOwner,
      isAdmin: isOwner,
      canManageMembers: isOwner,
      canManageChannels: isOwner,
      canManageRoles: isOwner
    };

    return [selfMember, ...members];
  }

  private normalizeMember(member: Member): Member {
    return {
      ...member,
      memberId: String(member.memberId),
      memberName: member.memberName || member.username || 'Unknown',
      username: member.username || member.memberName || 'unknown',
      userPic: member.userPic || '',
      status: member.status || 'offline',
      roles: member.roles?.length ? member.roles : ['Member'],
      joinedAt: member.joinedAt ? new Date(member.joinedAt) : new Date(),
      isOwner: !!member.isOwner,
      isAdmin: !!member.isAdmin,
      canManageMembers: !!member.canManageMembers,
      canManageChannels: !!member.canManageChannels,
      canManageRoles: !!member.canManageRoles
    };
  }
}
