if (typeof (BonusEventHandler) == 'undefined') {
	BonusEventHandler = {};
}
(function () {
	//let openBoxAudio;
	let bonusTemplate;
	BonusEventHandler.gameTagIdMap = {};
	BonusEventHandler.challengeIncludeGame = {};
	BonusEventHandler.challengingTicketMap = {};
	BonusEventHandler.banners = [];
	BonusEventHandler.stickers = [];

	let rebateStartDate;
	let rebateEndDate;
	let rebateFinalEndDate;
    let openedBonusPageIds = [];
    let swiperList = [];

	BonusEventHandler.init = function(){

		BonusTemplatesHandler.init();

		//openBoxAudio = document.getElementById("openBoxAudio");
		bonusTemplate = document.getElementById('bonusEventTemplate');
		if(PageConfig.hasBonusEvent){
			BonusEventHandler.queryBonusEvent();
		}
		if(PageConfig.isLoggedIn){
			setInterval(function() {
				getLatestRedeemTicket(openedBonusPageIds);
			}, 60 * 1000);// every minute
		}
		setTimeout(function() {
			if(sessionStorage.getItem("justLoggedIn") === "true" && Object.keys(PopupUtil.popupMap).length === 0){
				$j("#currencymsg").slideDown(1000).delay(4000).slideUp(1000);
				sessionStorage.removeItem("justLoggedIn");
			}
		}, 4000);
	}
	/****** bonus event ******/
	BonusEventHandler.openTicketList = function(e){
		BonusEventHandler.getRedeemedBonusTicket(e);
	}
	BonusEventHandler.closeTicketList = function(){
		PopupUtil.closeModal('#bonusTicketList');
		$j('#bonusTicketList').find('#bonusTicketWrapper').html('');
	}

	BonusEventHandler.getRedeemedBonusTicket = function(e){
		let bonusId = $j(e).attr('bonusId');
		let formData = {
			'bonusId': bonusId
		};

		postAjax({
			async:false,
			type: 'POST',
			data : formData,
			url: PageConfig.getRedeemedBonusTicket,
			success : function(response) {
				if (response.error ) {
					alert(response.error);
					location.reload();
					return;
				}

				let eventPage = $j(`#PageDiv${bonusId}`);
				let bonusMultiplier = eventPage.find('#bonusMultiplier').val() - 0;
				let challengeExpireHours = eventPage.find('#challengeExpireHours').val() - 0;
				let redeemDeadlineDate = eventPage.find('#redeemDeadlineDate').val() + ':00:00';
				let presentHandler = BonusEventPresentHandler.getHandler(eventPage.attr('presentType'));

				let ticketList = $j('#bonusTicketList');
				let totalCount = 0;
				let totalAmt = 0;
				let rowWrapper = ticketList.find('#bonusTicketWrapper');
				rowWrapper.empty();
				
				//沒資料秀NO_DATA
				if(response.length == 0){
					let rowTag = $j(bonusTemplate).find('#bonusTicketTemplate').clone();
					rowTag.find('#bonusTxId').html("NO_DATA");
					rowTag.find('.txt-bonus').remove();
					rowWrapper.append(rowTag);
				}
				let gameLines = eventPage.attr('freeSpinGameLines');
				response.forEach(function(ticket){
					totalAmt = totalAmt + ticket.bonusAmt;
					let rowTag = $j(bonusTemplate).find('#bonusTicketTemplate').clone();

					if(ticket.multiplyStartTime){
						if(ticket.status == PageConfig.ticketStatus.REDEEMED){
							if(ticket.multiplySuccessTime){
								rowTag.find("#anotherBonusDesc").append($j(bonusTemplate).find('#challengeSuccessHint').clone());
								if(bonusMultiplier > 1){
									rowTag.find('#multiplication').text( ticket.adjustBonusAmt +' x '+ bonusMultiplier);
									ticket.adjustBonusAmt = MathUtil.decimal.multiply(ticket.adjustBonusAmt, bonusMultiplier);
								}
							} else {
								rowTag.find("#anotherBonusDesc").append($j(bonusTemplate).find('#challengeFailHint').clone());
							}
						} else if(ticket.status == PageConfig.ticketStatus.ACCEPT_CHALLENGE) {
							rowTag.find("#anotherBonusDesc").append($j(bonusTemplate).find('#challengingHint').clone());
							if(bonusMultiplier > 1){
								rowTag.find('#multiplication').text( ticket.adjustBonusAmt +' x '+ bonusMultiplier);
								ticket.adjustBonusAmt = MathUtil.decimal.multiply(ticket.adjustBonusAmt, bonusMultiplier);
							}

							let expireTime = DateUtil.getLocalDate(ticket.multiplyStartTime);
							expireTime.setHours(expireTime.getHours() + challengeExpireHours);
							let deadline = DateUtil.getLocalDate(redeemDeadlineDate);
							if(deadline.getTime() < expireTime.getTime()){
								expireTime = deadline;
							}

							CountDownUtil.countToTime({
								'countArea':rowTag.find('#challengeCountDown'),
								'expireTime': expireTime,
								'expireText': 'Expired',
								'showHours': true
							});
						} else if (ticket.status == PageConfig.ticketStatus.FAIL_CHALLENGE) {
							rowTag.find("#anotherBonusDesc").append($j(bonusTemplate).find('#challengeFailHint').clone());
							ticket.adjustBonusAmt = 0;
						}

						if(bonusMultiplier > 1) {
							rowTag.find("#anotherBonusDesc").find('#bonusMultiplierText').text(bonusMultiplier+'X')
						}
					}
					
					if (ticket.rankRewardType) {
						
						if(rowTag.find('#multiplication').text == ''){
							rowTag.find('#multiplication').text( ticket.adjustBonusAmt +
							' + '+ ticket.rankRewardPercentage + "%");
						}else{
							rowTag.find('#multiplication')
								.text(rowTag.find('#multiplication').text() +
								' + '+ ticket.rankRewardPercentage + "%");
						}
						ticket.adjustBonusAmt = MathUtil.decimal.multiply(ticket.adjustBonusAmt, (1 + ticket.rankRewardPercentage/100));
						
                       	let badgeBox = $j(bonusTemplate).find('#badgeBox').clone();
						badgeBox.find("#badgeType").addClass(ticket.rankRewardType);

						if (ticket.rankRewardType === 'daily') {
							const $dailyImg = $j('<img src="'+PageConfig.imagePrefix+'/theme/images/src-common/TOURNAMENT-img/DAILY-badge.png" alt=""/>');
							badgeBox.find("#badgeType").prepend($dailyImg);
						} else if(ticket.rankRewardType === 'weekly'){
							const $monthlyImg = $j('<img src="'+PageConfig.imagePrefix+'/theme/images/src-common/TOURNAMENT-img/WEEKLY-badge.png" alt=""/>');
							badgeBox.find("#badgeType").prepend($monthlyImg);
						} else {
							const $monthlyImg = $j('<img src="'+PageConfig.imagePrefix+'/theme/images/src-common/TOURNAMENT-img/MONTHLY-badge.png" alt=""/>');
							badgeBox.find("#badgeType").prepend($monthlyImg);
						}


						rowTag.find("#anotherBonusDesc").append(badgeBox);
					}

					if (ticket.ticketTier) {
						let tierClass = presentHandler.tierClass[ticket.ticketTier];
						let tierLabel = presentHandler.tierLabel[ticket.ticketTier];
						rowTag.find("#anotherBonusDesc").append(
							`<div class="ticket-tier-box ${tierClass}"><span class="ticket-tier-label"><i class="icon icon-ticket"></i>${tierLabel}</span><span>-1</span></div>`);
					}

					if(ticket.multiplyStartTime == null && ticket.rankRewardType == null && ticket.ticketTier == null){
						rowTag.find("#anotherBonusDesc").remove();
					}

					rowTag.find('#ticketRowId').html(++totalCount);
					rowTag.find('#bonusTxId').html(ticket.txnId);
					rowTag.find('#ticketUpdateTime').html(ticket.updateTime);
					let freeSpinCount = parseInt(ticket.freeSpinCount);
					if (freeSpinCount > 0) {
						let remainCount = parseInt(ticket.remainCount);
						let spinCount = freeSpinCount - remainCount;
						let freeSpinAmt = MathUtil.decimal.multiply(gameLines,
						MathUtil.decimal.multiply(ticket.freeSpinBaseAmt,ticket.freeSpinMultiplier));
                        freeSpinAmt = MathUtil.decimal.multiply(freeSpinAmt, freeSpinCount);

						rowTag.find('#spinCount').text(spinCount);
						rowTag.find('#freeSpinCount').text(ticket.freeSpinCount);
						rowTag.find('#freeSpinAmt').text(freeSpinAmt);

						let freeSpinBox = rowTag.find('#freeSpinBox');
						if(remainCount > 0){
							freeSpinBox.attr('game_code', ticket.gameCode);
							freeSpinBox.attr('gameType', ticket.gameType);
							freeSpinBox.attr('platform', eventPage.attr('platform'));

						}else{
							freeSpinBox.attr('onclick','');
							freeSpinBox.addClass('is-success');
						}
						freeSpinBox.show();
					}
                    rowTag.find('#txnBonusDiv').show();
                    rowTag.find('#ticketBonusAmt').html(NumberFormatUtil.formatNumber(ticket.adjustBonusAmt,2));
					rowWrapper.append(rowTag);
				});
				// ticketList.find('#totalCount').html('Total(' + totalCount + ')');
				// ticketList.find('#totalAmt').html(NumberFormatUtil.formatNumber(totalAmt,1));
				PopupUtil.openModal("#bonusTicketList");
			},beforeSend:function(){
				PopupUtil.openModal('#loadingMask');
			},
			complete:function(){
				PopupUtil.closeModal('#loadingMask');
			}
		});
	}

	BonusEventHandler.getBonusEventRealTimeInfo = function(bonusIds, async){
		if(!async){
			async = false;
		}
		let dailyMissionsEvents = [];
		if(!PageConfig.isLoggedIn){
			let bonusIdArray = bonusIds.split(',');
			PageConfig.jspBonusEvents.forEach(function(bonusEvent) {
				if(bonusIdArray.includes(bonusEvent.bonusId)) {
					if(bonusEvent.presentType == 'REBATE'){
						$j(`#PageDiv${bonusEvent.bonusId}`).find('#eventTurnover')
							.html('0').addClass(PageConfig.chosenCurrency);
					}
					if(bonusEvent.presentType == 'REBATE'){
						// donothing
					}else if (bonusEvent.presentType !== 'DAILY_MISSION') {
						openedBonusPageIds.push(bonusEvent.bonusId);
					}else{
						dailyMissionsEvents.push(bonusEvent);
					}
					if (bonusEvent.presentType !== 'REBATE' && bonusEvent.presentType !== 'DAILY_MISSION') {
						showBonusEventPage(bonusEvent, bonusEvent.bonusId);
					}
				}
			});

			dailyMissionsEvents.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
			if(dailyMissionsEvents.length != 0){
				showDailyMissionEventPage(dailyMissionsEvents);
			}

			return;
		}
		console.time("getBonusEventRealTimeInfo");
		let formData = {
			'bonusIds': bonusIds
		};

		let jqXhr = postAjax({
			async:async,
			type: 'POST',
			data : formData,
			url: PageConfig.getBonusEventRealTimeInfo,
			success : function(response) {
				openedBonusPageIds = [];
				if (response == null || $j.isEmptyObject(response) || response.error ) {
					if (response.error) {
						alert(response.error);
					}else{
						alert("Error occurred, please refresh and try again later !");
					}
					location.reload();
					return;
				}

				response.forEach(function(bonusEvent) {
					if(bonusEvent.presentType == 'REBATE'){
						$j(`#PageDiv${bonusEvent.bonusId}`).find('#eventTurnover')
							.html(NumberFormatUtil.formatNumber(bonusEvent.eventTurnover, 2)).addClass(PageConfig.chosenCurrency);
					}
					if (bonusEvent.presentType == 'REBATE'){
						// donothing
					}else if (bonusEvent.presentType !== 'DAILY_MISSION') {
						openedBonusPageIds.push(bonusEvent.bonusId);
					}else{
						dailyMissionsEvents.push(bonusEvent);
					}
					if (bonusEvent.presentType !== 'REBATE' &&  bonusEvent.presentType !== 'DAILY_MISSION') {
						showBonusEventPage(bonusEvent, bonusEvent.bonusId);
					}
				});

				dailyMissionsEvents.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
				if(dailyMissionsEvents.length != 0){
					showDailyMissionEventPage(dailyMissionsEvents);
				}
			}
		});

		console.timeEnd("getBonusEventRealTimeInfo");
		return jqXhr;
	}


	BonusEventHandler.handleClickDailyMissionSection = function(ele){

		//沒登入直接用以前的開Page
		if(!PageConfig.isLoggedIn){
			BonusEventHandler.toggleBonusEvent(ele);
			return;
		}

		let dailyMissionsEvents = [];
		postAjax({
			data: {
				bonusIds: $j(ele).attr('bonusid')
			},
			async: false,
			url: PageConfig.getBonusEventRealTimeInfo,
			success: function(response) {

				if (response == null || $j.isEmptyObject(response) || response.error) {
					if (response && response.error) {
						alert(response.error);
					} else {
						alert("Error occurred, please refresh and try again later !");
					}
					location.reload();
					return;
				}

				const eventId = $j(ele).attr('id').replace('toolItem_', '');
				for (const event of response) {
					if(event.bonusId === eventId){
						//如果當天人物任務已經完成
						if(!event.todayUndoneTicket){
							let date = DateUtil.getPrevSettleTime().toISOString();
							let ticketDate = date.split('T')[0];
							//檢查當前票的狀態
							const ticketJson = event.allTicketMap[ticketDate];
							if(ticketJson && ticketJson.status == 0){
								//只用到元素的 bonusid 這個屬性
								const pageDiv = $j('#PageDiv' + eventId);
								//當日檢查有票可領 現有票數+1 讓他可以領
								pageDiv.attr('ticketCount', Number(pageDiv.attr('ticketCount') || 0) + 1);
								BonusEventHandler.takeTicket(pageDiv[0], false, ticketJson.ticketID, ticketDate);
								return;
							}
						}
					}
					dailyMissionsEvents.push(event);
				}

				dailyMissionsEvents.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));
				if(dailyMissionsEvents.length != 0){
					showDailyMissionEventPage(dailyMissionsEvents);
				}
			}
		});
	}

	BonusEventHandler.toggleBonusEvent = function (e){
		let ele = $j(e);
		let presentType = ele.attr('presentType');

		if(presentType == 'REBATE'){

			BonusEventHandler.getBonusEventRealTimeInfo(PageConfig.rebateBonusIdArr.join(','));
			PopupUtil.openModal('#Rebate-POP');
		}else {
			let bonusId = ele.attr('bonusId');
			let page;

			if(presentType == 'DAILY_MISSION'){
				page = $j('#dailyMissionsPageDiv');
			}else{
				page = $j(`#PageDiv${bonusId}`);
			}
			if (typeof ChallengeEventHandler === 'object') {
				ChallengeEventHandler.isCloseChallengeDesc = false;	// 重新開啟左下角的挑戰票提示
			}

			if (GameHallUtils.isBS()) {
				$j('#bonusPopupCloseBtn').click();
			}

			page.find('#innerFreeSpinStiker').remove();

			if (!page.hasClass('active')) {
				if (presentType === 'JACKPOT_INSTANT_PAY' && showJackpotInstantPayTicket(ele.data('bonusJackpotInfo'))) {
					return
				}
				BonusEventHandler.getBonusEventRealTimeInfo(bonusId);
			} else {
				page.removeClass('active');
				page.find('#ticketAmtWrapper').text('0');
				if (PageConfig.isMobile) {
					page.find('#defaultBonusResult').show();
					page.find('#winBonusResult').hide();
					page.removeClass('shiftGame');
				}
				// 活動可能同時開啟多個，全部關閉後才可將遮罩關閉
				if ($j('.page-bonus-div.active').length == 0) {
					$j('#gameHallChallengeSizesDesc').hide();
					$j('body').removeClass('bonusevent-open');
					if (PageConfig.isMobile) {
						// 不確定是否還有需要?
						$j('#modalSlotGame').hide();
					}
				}

				if(presentType === 'DAILY_MISSION') {
					bonusId = $j(page).attr('bonusId');
				}
				$j('.page-backdrop[bonusid="' + bonusId + '"]').removeClass('show');
				PopupUtil.removePopup(bonusId);

				//Daily_Mission 檢查是否還有票
				if (PageConfig.isLoggedIn) {
					if (page.attr('presentType') == 'DAILY_MISSION') {


						const dailyMissionArea = document.querySelector('#dailyMissionsPageDiv #dailyMissionArea');

						// 確認元素是否存在
						if (dailyMissionArea) {
							// 抓取所有的 campaign 元素
							const campaigns = dailyMissionArea.querySelectorAll('.campaign');

							// 初始化統計變數
							let istodaymissiondoneCount = 0;
							let istodaymissiondoneSum = true;
							let ticketCountSum = 0;

							// 遍歷 campaign 元素
							campaigns.forEach(campaign => {
								// 獲取 ticketcount 屬性值
								const ticketcount = parseInt(campaign.getAttribute('ticketcount')) || 0;

								// 統計值
								istodaymissiondoneSum = (istodaymissiondoneSum && campaign.getAttribute('istodaymissiondone') === 'true');
								ticketCountSum += ticketcount;
							});

							if (ticketCountSum == 0 && istodaymissiondoneSum) {
								$j('#dailyMissionsDiv').find('#dailyMissionDot').hide();
								let img = $j('#dailyMissionStickerImg');
								let imgSrc = img.attr('src');
								if (imgSrc.indexOf('-static.webp') === -1) {
									img.attr('src', imgSrc.replace('.webp', '-static.webp'));
								}
							}
						}
					}
				}
			}
		}
	}
	/**
	 * 關閉全部popup的bonus event modal (包含mask)
	 */
	BonusEventHandler.closeAllBonusEvents = function (){
		ChallengeEventHandler.isCloseChallengeDesc = false;	// 重新開啟左下角的挑戰票提示
		ChallengeEventHandler.filterBonusEventID = "";
		if(GameHallUtils.isBS()){
			$j('.modalBonusEvent').each(modal=>{
				$j(modal).find('#bonusPopupCloseBtn').click();
			});
		}
		$j('.page-bonus-div.active').removeClass('active');
		$j('.page-backdrop.show').removeClass('show');
		if($j('.page-bonus-div.active').length == 0) {
			$j('body').removeClass('bonusevent-open');
			if(PageConfig.isMobile){
				// 不確定是否還有需要?
				$j('#modalSlotGame').hide();
			}
		}
	}

	BonusEventHandler.openToastAlert = function (formData) {
		const toastAlert = $j('#toastAlert');
		const brandLogo = toastAlert.find('.brand-logo');
		toastAlert.find('.txt-subtitle').remove();
		let innerContent = '';
		if(formData.bonusAmt > 0){
			innerContent = `<p class="txt-subtitle">${I18N.get('totalBonus')}
            				<span class="award-prize ${PageConfig.chosenCurrency}">${NumberFormatUtil.formatNumber(formData.bonusAmt,2)}</span>
        					</p>`;
		}
		if (formData.freeSpinAmt > 0) {
			innerContent = innerContent + `<p class="txt-subtitle">${I18N.get('totalFreeSpin')}
											<span class="award-prize freeSpin ${PageConfig.playerCurrency}">${NumberFormatUtil.formatNumber(formData.freeSpinAmt,2)}</span>
											</p>`;
		}
		innerContent = innerContent + `<p class="txt-subtitle">${I18N.get('redeemed')}
											<span class="txt-ticket">
											<i class="icon-ticket"></i>×<span id="toastTicketCounts">${formData.ticketCount}</span>
											</span>
											</p>`;
		if (innerContent) {
			brandLogo.after(innerContent);
		}
		$j('#toastPlatformImg').attr('src',`${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${formData.platform}-logo.webp`)
		$j('#toastAlert').toast('show');
	}

	BonusEventHandler.openFancyAlert = function (bonusId, message, classList,presentType){
		let fancyAlert = $j('#fancyAlert');
		fancyAlert.attr('bonusId', bonusId);
		fancyAlert.attr('presentType', presentType);
		fancyAlert.attr('class','function-alert');
		$j('#fancyAlertMsg').html(message);
		if(classList && classList.length > 0){
			for(let clazz of classList){
				fancyAlert.addClass(clazz);
			}
			fancyAlert.addClass('show');
		}
		$j('#fancyAlert').data('lastAlertTime', Date.now());
	}

	BonusEventHandler.closeFancyAlert = function ( id= "fancyAlert"){
		let modal = $j(`#${id}`);
		let bonusId = modal.attr('bonusId');
		let presentType =  modal.attr('presentType');
		let page;
		if (presentType === 'DAILY_MISSION') {
			page = $j('#dailyMissionsPageDiv');
		}else{
			page = $j(`#PageDiv${bonusId}`);
		}
		//build result area
		let presentHandler = BonusEventPresentHandler.getHandler(page.attr('presentType'));
		presentHandler && presentHandler.onCloseFancyAlert(page);
		if('fancyAlert' === id) {
			modal.attr('class', 'function-alert');
			//配合挑戰新UI呈現
			modal.html(`
					<div id="fancyAlertMsg" class="function-box"></div>
					<img class="img-bonus-win-gold" src="` + PageConfig.imagePrefix + `/theme/images/src-common/BONUSEVENT-img/bonus-win-gold.webp" alt=""/>
					<img class="img-toast-light" src="` + PageConfig.imagePrefix + `/theme/images/src-common/BONUSEVENT-img/toast-light.webp" alt=""/>
			`);
			modal.attr('onclick', 'BonusEventHandler.closeDelayFancyAlert(1500)');
		}else{
			modal.attr('class', 'function-alert common');
		}
		modal.removeAttr('bonusId');
	}

	BonusEventHandler.closeDelayFancyAlert = function (time){
		let lastAlertTime = $j('#fancyAlert').data('lastAlertTime');
		let now = Date.now();
  		if(now - lastAlertTime > time){
			$j('#fancyAlert').data('lastAlertTime', now);
  			BonusEventHandler.closeFancyAlert();
		}
	}
	BonusEventHandler.eggConfirm = function(ele,skinName){
		if($j(ele).hasClass('disable')){
			return;
		}
		let eggType = $j(ele).attr('eggType');
		if(eggType == 'copper'){
			BonusEventHandler.takeTicket(ele,false);
			return;
		}
		$j('#eggConfirmYesBtn').off('click');
		//$j('#eggConfirmYesBtn').attr('eggType',eggType).attr('bonusId',$j(ele).attr('bonusId'))
		$j('#eggConfirmYesBtn').on('click',function(){
				BonusEventHandler.takeTicket(ele,false);
				$j('#eggConfirm').removeClass('show');
		});
		let eggMsg = `Are you sure you want to redeem a ${eggType.toUpperCase()} ${skinName} ?`;
		$j('#eggMsg').text(eggMsg);
		$j('#eggConfirm').show().addClass('show');
	}
	BonusEventHandler.takeTicketLock = false;
	BonusEventHandler.takeTicket = function (ele,isTakeAll,pickedBox, ticketDate){
		if(BonusEventHandler.takeTicketLock){
			return;
		}

		BonusEventHandler.takeTicketLock = true;
		let bonusId = $j(ele).attr('bonusId');
		let page = $j(`#PageDiv${bonusId}`);
		if (PageConfig.onlyAppEvents.includes(bonusId)) {
			const isPWAEnabled = typeof isPWA === 'function' ? isPWA() : false;
			const isAppOrPWA = PageConfig.isApp || isPWAEnabled;
			//不是App也不是PWA，並且 (非Mobile 或要顯示App 連結)
			if (!isAppOrPWA) {
				if (confirm('Redeem tickets by APP only!! Confirm to download.')) {
					if(PageConfig.isAndroid){
						$j("#downloadApp").click();
					}else{
						$j("#installPWA").click();
					}
				}
				BonusEventHandler.takeTicketLock = false;
				return;
			}
		}

		let ticketCount = page.attr('ticketCount');
		if(ticketCount <= 0 ){
			BonusEventHandler.takeTicketLock = false;
			return;
		}
		
		let rankReward = '';
		if(page.find("#rewardType").find(".active").length == 1){
			rankReward = page.find("#rewardType").find(".active").data('rewardtype');
			//如果小於0
			if(parseInt(page[0].safeSelector("#" + rankReward + "RewardCnt").innerText) <= 0){
				BonusEventHandler.takeTicketLock = false;
				alert('your '+ rankReward + ' rank reward is 0 !!');
				return;
			}
		}
		let formData = {
			'bonusId': bonusId,
			'isTakeAll' : isTakeAll,
			'pickedBox' : pickedBox,
			'rankReward' : rankReward,
			'eggType' : $j(ele).attr('eggType'),
			'ticketDate' : ticketDate
		};
		let presentHandler = BonusEventPresentHandler.getHandler(page.attr('presentType'));
		postAjax({
			async:true,
			type: 'POST',
			data : formData,
			timeout:3500,
			url: PageConfig.takeBonusTicket,
			beforeSend: function(){
				presentHandler.beforeAjax(page,ele);
			},
			success : function(response) {
				if (response == null || $j.isEmptyObject(response) || response.error ) {
					if (response.error) {
						alert(response.error);
					}else{
						alert("Error occurred, please refresh and try again later !");
					}
					location.reload();
					return;
				}
				page.attr('ticketCount',response.ticketCount);
				page.attr('challengeCount',response.challengeCount);
				page.find('#ticketCountSpan').text(response.ticketCount);

                // CRMPS-6250 若已經使用今天發的票，即時更新畫面上已使用票數
				let todayTickets = page.find('#todayTickets').text();
				if (todayTickets && todayTickets > response.ticketCount) {
				    page.find('#todayRedeemedTickets').text(todayTickets - response.ticketCount);
				}
				
				//更新積分如果有的話
				let vipPoints = page.find('#point');
				if(response.vipPoints !== undefined && vipPoints.length > 0){
					vipPoints.text(NumberFormatUtil.formatNumber(response.vipPoints, 0)); 
				}				
				
				//show result
				presentHandler.takeTicketProcess(page, response, formData).then(() => {
					
					//小遊戲
					return new Promise(resolve=>{
						presentHandler.playMiniGame(page, response, formData).then(() => {
							resolve();
						});
					})
				}).then(() => {
					formData.rankRewardPercentage = response.rankRewardPercentage||'';
					if(response.challengingTicketId){
						// TODO show challenging animation
						presentHandler.takeTicketResult(page, response, formData, ele)
							.then(()=>{
								let ticketObj = JSON.parse(response.challengingTicket);
								let entranceElement = $j('#challengeAlert').find('#challengeEntranceDiv');
								entranceElement.find('#imgPlatform').empty();
								GameHallUtils.setPlatformImg(entranceElement, '#imgPlatform', ticketObj.platform);
							 	let aElement = entranceElement.find('a');
								aElement.attr('platform', ticketObj.platform);
								aElement.attr('bonusid', bonusId);
								aElement.attr('presentType', page.attr('presentType'));
								let recentTurnover = 0;
								if (response.presentType === 'DAILY_MISSION') {
									if(response.recentTurnoverMap){
										recentTurnover = response.recentTurnoverMap[ticketObj.ticketID];
									}
								} else {
									recentTurnover = response.recentTurnover;
								}
								ChallengeEventHandler.buildChallengingTicket(ticketObj, entranceElement, recentTurnover);
								$j('#challengeAlert').addClass('show');
								$j('#challengeAlert').on('click', function (e) {
									// 如果點擊的不是 function-box 裡面
									if ($j(e.target).closest('.function-box').length === 0) {
										BonusEventHandler.closeFancyAlert('challengeAlert');
									}
								});
								ChallengeEventHandler.showForcingBonusTicket(response);
							});
						if(page.attr('presentType') === 'DAILY_MISSION'){
							if($j('#dailyMissionsPageDiv').hasClass('active')){
								BonusEventHandler.getBonusEventRealTimeInfo(bonusId);
							}
						}else if (page.hasClass('active')){
							BonusEventHandler.getBonusEventRealTimeInfo(bonusId);
						}
					} else if(response.takenTicketId){
						BonusEventHandler.showChallengeChoiceDiv(response, bonusId);
						let challengeChoiceDiv = $j('#challengeChoiceDiv');
						challengeChoiceDiv.data('response', response);
						challengeChoiceDiv.data('formData', formData);
					} else {
						presentHandler.takeTicketResult(page, response, formData,ele);
					}
				});
			},
			complete: function(){
				presentHandler.afterAjax(page);
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				if (textStatus === "timeout" || textStatus === "error") {
					alert(I18N.get('player.bonusEvent.msg.networkError'));
				}

				presentHandler.ajaxError(page,bonusId, ele);
			}
			//loadingMask: '#loadingMask'
		});
	}
	
	BonusEventHandler.queryBonusEvent = function(){
		if(PageConfig.jspBonusEvents){
			new Promise(resolve => {
				buildBonusEvent(PageConfig.jspBonusEvents);
				resolve();
			});
		}else{
			console.time('queryBonusEvent');
			//const async = true;
			postAjax({
				async:true,
				type: 'POST',
				url: PageConfig.queryBonusEvent,
				success : function(response) {
					if (response == null || $j.isEmptyObject(response) || response.error ) {
						if (response.error) {
							alert(response.error);
						}
						return;
					}
					buildBonusEvent(response);
				},beforeSend:function(){
					console.time("queryBonusEventMask");
					PopupUtil.openModal('#loadingMask');
				},
				complete:function(){
					console.timeEnd("queryBonusEventMask");
					PopupUtil.closeModal('#loadingMask');
				}
			});
			console.timeEnd("queryBonusEvent");
		}
	}
	function convertToLocalTime(gmt8String) {
		//"2024-11-11 12"
		const [datePart, timePart] = gmt8String.split(" ");
		const [year, month, day] = datePart.split("-").map(Number);
		const [hour] = timePart.split(":").map(Number);
		//time zone
		const timezoneOffset = new Date().getTimezoneOffset();
		let offsetHours = parseFloat(MathUtil.decimal.divide(timezoneOffset, 60));
		// return new Date(Date.UTC(year, month - 1, day, hour-8-offsetHours));

		let localDate = new Date(Date.UTC(year, month - 1, day, hour));
		localDate.addHours(-8-offsetHours); //透過addHours才可以處理.5 30分鐘時區的問題, Ex:印度+5.5時區

		return localDate;
	}

	function buildRebateTimeDesc(isoDateStr){
		//2024-11-12T10:30:00.000Z
		let dateTimeSplit = isoDateStr.split('T');
		let dateSplit = dateTimeSplit[0].split('-');
		let timeSplit = dateTimeSplit[1].split(':');

		return `${dateSplit[1]}/${dateSplit[2]} ${timeSplit[0]}:${timeSplit[1]} ${parseInt(timeSplit[0] < 12) ? 'AM':'PM'}`;
	}

	function buildBonusEventGameWrapper(bonusEvent, gameListName, bonusEventGameWrapper, gameTemplate, gameTagId) {
		const isTallWide = GameHallUtils.isTallWide();
		bonusEvent[gameListName].forEach(function (game) {
			let platform = game.platform;

			// 1. 處理 Tag 邏輯 (僅 requiredGameList 需要，且活動尚未結束)
			if (!bonusEvent.isEnd && gameListName === 'requiredGameList') {
				let cacheKey = GameHallUtils.buildCacheKey(game);
				let gameTags = BonusEventHandler.gameTagIdMap[cacheKey];
				if (!gameTags) {
					gameTags = {};
					BonusEventHandler.gameTagIdMap[cacheKey] = gameTags;
				}
				gameTags[gameTagId] = 1;
			}

			// 2. 處理 Template 複製與基礎樣式
			if (isTallWide) {
				game.forceStyleSuffix = GameHallUtils.tallStyleSuffix;
			}
			let gameLi = gameTemplate.cloneNode(true);
			let imgUrl = GameHallUtils.getImgUrl(game, false, GameHallUtils.getDBImageType());

			// 3. 處理遊戲圖片與版型 (EntryGameType 判斷)
			if (PageConfig.showEntryGameType.includes(game.gameType.toUpperCase())) {
				gameLi.safeSelector('#liImg').remove();
				gameLi.safeSelector('#gameImg').setAttribute('src', imgUrl);
				gameLi.safeSelector('#platformLogoImg').setAttribute('src', GameHallUtils.getEntryGamePlatformImageUrl(game));
				GameHallUtils.setBonusEventClass(bonusEventGameWrapper, game);
			} else {
				gameLi.safeSelector('#threePicModeEle').remove();
				gameLi.safeSelector('#liImg').setAttribute('src', imgUrl);
			}

			// 4. 設定共同的 DOM 屬性與 Class
			gameLi.setAttribute('platform', platform);
			gameLi.setAttribute('id', `${platform}_${game.gameKey}`);
			gameLi.classList.add(PageConfig.platformStatus[platform].statusClass);
			gameLi.classList.add(platform);

			// 5. 特例處理：REBATE 需要填入遊戲名稱
			if (bonusEvent.presentType === 'REBATE') {
				gameLi.safeSelector('#gameNameP').innerHTML = GameHallUtils.getGameDisplayName(game);
				gameLi.safeSelector('#platformNameP').remove();
			} else if (bonusEvent.presentType === 'JACKPOT_INSTANT_PAY') {
				gameLi.safeSelector('#gameNameP').remove();
				GameHallUtils.setPlatformImg(gameLi, '#platformNameP', platform);
			}

			// 6. 特例處理：Challenge 需要處理 Jackpot 顯示
			if (gameListName === 'challengeGameList') {
				let $jackpotElem = $j(gameLi).find(".show-jackpot");
				if (GameHallUtils.isWL()) {
					$jackpotElem.hide();
				} else {
					game.showJackpot ? $jackpotElem.show() : $jackpotElem.hide();
				}
			}

			// 7. 設定綁定事件與顯示限制，並插入畫面
			GameHallUtils.setGameInfoToBtn(gameLi, game);
			GameHallUtils.displayByBonusLimit(gameLi);

			bonusEventGameWrapper.appendChild(gameLi);
		})
	}

	function buildBonusEvent(response){
		let needRealTimeInfoArray = new Array();
		let BSGameHallStickerTime;
		let bonusEventCount = 0;
		let dailyMissionEvent = [];
		response.forEach(function(bonusEvent){

			if(bonusEvent.presentType == 'DAILY_MISSION'){
				dailyMissionEvent.push(bonusEvent);
				return;
			}

			//各個活動產生專屬遮罩
			//if(!PageConfig.isMobile){
				let backdrop = document.createElement('div');
				backdrop.className = 'page-backdrop';
				backdrop.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this);');
				backdrop.setAttribute('bonusid', bonusEvent.bonusId);

				document.body.appendChild(backdrop);
			//}

			//SIGNUP 活動跟其他活動不一樣
			//DAILY_MISSION 活動跟其他活動不一樣
			//GOLDEN_EGG 不一樣
			//REBATE 不一樣
			let bonusEventPage;
			let presentHandler = BonusEventPresentHandler.getHandler(bonusEvent.presentType);
			//RWD跟EZ是banner，只長兩個。如果是一般的活動，且數量已經超過2個就跳過不組畫面了。
			if(!['SIGNUP','DAILY_MISSION','JACKPOT','REBATE'].includes(bonusEvent.presentType) &&
				(GameHallUtils.isRWD() || GameHallUtils.isEZ()) && bonusEventCount >= 2){
				return;
			}
			if(bonusEvent.presentType == 'REBATE'){
				PageConfig.rebateBonusEntityArr.push(bonusEvent);
				let prizeJson = JSON.parse(bonusEvent.prizeDistribution);
				prizeJson.rebateRatio = MathUtil.decimal.multiply(prizeJson.rebateRatio,100);
				bonusEvent.prizeJson = prizeJson;
				//sticker
				BonusEventHandler.buildEntrance(bonusEvent, PageConfig.gameHallType, PageConfig.isMobile);
				//page bonusEventPage
				bonusEventPage = bonusTemplate.safeSelector('#rebatePageTemplate').cloneNode(true);
				PageConfig.rebateBonusIdArr.push(bonusEvent.bonusId);
				let platformImg = bonusEventPage.safeSelector('#platformImg');
				platformImg.setAttribute('src',
					`${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/120x80-fullname/${bonusEvent.platform}-logo.webp`);
				platformImg.classList.add(bonusEvent.platform);

				$j('#rebateRatio').html(bonusEvent.prizeJson.rebateRatio);

				//決定起迄時間
				if(!rebateStartDate){
					rebateStartDate = convertToLocalTime(bonusEvent.startDate);
					rebateEndDate = convertToLocalTime(bonusEvent.endDate);
					rebateFinalEndDate = bonusEvent.endDate;
				} else {
					let tempStartDate = convertToLocalTime(bonusEvent.startDate);
					let tempEndDate = convertToLocalTime(bonusEvent.endDate);
					let tempFinalEndDate = bonusEvent.endDate;
					if(tempStartDate.getTime() < rebateStartDate.getTime()){
						rebateStartDate = tempStartDate;
					}
					if(tempEndDate.getTime() > rebateEndDate.getTime()){
						rebateEndDate = tempEndDate;
						rebateFinalEndDate = tempFinalEndDate;
					}

				}
			} else if(bonusEvent.presentType == 'GOLDEN_EGG'){
				let backdrop = document.createElement('div');
				backdrop.className = 'goldenEgg-backdrop';
				backdrop.setAttribute('bonusid', bonusEvent.bonusId);

				document.body.appendChild(backdrop);

				//sticker
				BonusEventHandler.buildEntrance(bonusEvent, PageConfig.gameHallType, PageConfig.isMobile);
				//page bonusEventPage
				bonusEventPage = bonusTemplate.safeSelector('#goldenEggPage').cloneNode(true);
				bonusEventPage.safeSelector('#bonusHeaderImg').setAttribute('src',
					`${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp`);
				bonusEventCount = bonusEventCount+1;

				let skin = bonusEvent.skinName;
				let folder = `GOLDENEGG/${skin.toUpperCase()}`;
				bonusEventPage.safeSelector('#ticketIcon').setAttribute('src',`${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/${folder}/gold${skin}-ticket.webp`);

			} else if(bonusEvent.presentType === 'SIGNUP'){
				//page
				bonusEventPage = bonusTemplate.safeSelector('#bonusSignupEventPage').cloneNode(true);
			}else if(bonusEvent.presentType === 'JACKPOT'){
				//do nothing
			}else if(bonusEvent.presentType === 'JACKPOT_INSTANT_PAY'){
				PageConfig.jackpotInstantPayEvents.push(bonusEvent.bonusId);
				//sticker
				BonusEventHandler.buildEntrance(bonusEvent, PageConfig.gameHallType, PageConfig.isMobile);
				//page
				bonusEventPage = bonusTemplate.safeSelector('#jackpotInstantPayPage').cloneNode(true);
				bonusEventCount = bonusEventCount+1;
			}else{
				//sticker
				BonusEventHandler.buildEntrance(bonusEvent, PageConfig.gameHallType, PageConfig.isMobile);
				//page
				bonusEventPage = bonusTemplate.safeSelector('#bonusEventPage').cloneNode(true);
				bonusEventPage.safeSelector('#bonusHeaderImg').setAttribute('src',
					`${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp`);
				bonusEventCount = bonusEventCount+1;
			}
			if(bonusEvent.presentType == 'REBATE'){
				bonusEventPage.setAttribute('id', 'PageDiv' + bonusEvent.bonusId);
				bonusEventPage.safeSelector('#currency').classList.add(PageConfig.chosenCurrency);
				bonusEventPage.safeSelector('#infoHtml').innerHTML = bonusEvent.infoHtml;
				bonusEventPage.safeSelector('#hintHtml').innerHTML = bonusEvent.hintHtml;
				bonusEventPage.setAttribute('presentType',bonusEvent.presentType);
				bonusEventPage.dataset.platform = bonusEvent.platform;
				if(bonusEvent.activeHoursPeriodList.length > 0){
					bonusEventPage.safeSelector('#activeHoursPeriodDiv').style.display = '';
				}
				handleRebateActiveHoursPeriodBlock(bonusEventPage, bonusEvent.activeHoursPeriodList, bonusEvent.startDate);

				//build result area
				presentHandler.buildResultArea(bonusEvent, bonusTemplate, bonusEventPage.safeSelector('#bonusEventResultWrapper'));

				// 建立需求遊戲清單的遊戲
				buildBonusEventGameWrapper(bonusEvent, 'requiredGameList', bonusEventPage.safeSelector('#bonusEventGameWrapper'),
					bonusTemplate.safeSelector('#bonusEventRebateGameTemplate'), presentHandler.gameTagId);

				let rebateSection = document.getElementById('rebateSection');
				rebateSection.appendChild(bonusEventPage);

				// keep event information
				bonusEventPage.safeSelector('#platform').value = bonusEvent.platform;

				//改為批次取回
				needRealTimeInfoArray.push(bonusEvent.bonusId);

				//參加的平台，要秀promo標籤(signup 一律不秀)
				if (PageConfig.showPromoGameTypeByPlatform) {

					PageConfig.canShowGameTypeList.forEach(gameType => {
						bonusEvent.allGamePlatforms.forEach(platform => {
							if (PageConfig.showPromoGameTypeByPlatform.has(gameType)) {
								let platformSet = PageConfig.showPromoGameTypeByPlatform.get(gameType);
								platformSet.add(platform);
							} else {
								PageConfig.showPromoGameTypeByPlatform.set(gameType, new Set([platform]));
							}
						});
					})
				}
			}else if(bonusEvent.presentType != 'JACKPOT') {
				bonusEventPage.setAttribute('id', 'PageDiv' + bonusEvent.bonusId);
				bonusEventPage.setAttribute('style', 'background-image: url("//' + bonusEvent.backgroundUrl + '")');
				bonusEventPage.setAttribute('bonusId', bonusEvent.bonusId);
				bonusEventPage.setAttribute('issueType', bonusEvent.issueType);
				bonusEventPage.setAttribute('platform', bonusEvent.platform);
				bonusEventPage.setAttribute('freeSpinGameLines', bonusEvent.freeSpinGameLines);
				bonusEventPage.setAttribute('isOnlyApp', bonusEvent.isOnlyApp);
				bonusEventPage.setAttribute('skinName', bonusEvent.skinName);
				bonusEventPage.classList.add(bonusEvent.platform);
				presentHandler.className.split(" ").forEach(function (className) {
					bonusEventPage.classList.add(className);
				})
				if (!PageConfig.isMobile) {
					bonusEventPage.classList.add('iframe-div');
				}
				bonusEventPage.safeSelector('#backBtn').setAttribute('bonusId', bonusEvent.bonusId);
				if (bonusEvent.presentType === 'GOLDEN_EGG') {
					bonusEventPage.classList.add(`gold${bonusEvent.skinName}`);
				}
				bonusEventPage.safeSelector('#bonusEventTime').innerHTML = bonusEvent.eventTimeDesc;
				bonusEventPage.safeSelector('#totalBonus').innerHTML = NumberFormatUtil.formatNumber(bonusEvent.grandPrize, 0);
				bonusEventPage.safeSelector('#currency').classList.add(PageConfig.chosenCurrency);
				bonusEventPage.safeSelector('#hintHtml').innerHTML = bonusEvent.hintHtml;
				bonusEventPage.safeSelector('#footerHtml').innerHTML = bonusEvent.footerHtml;
				bonusEventPage.safeSelector('#barrageSwiper').setAttribute('id', 'barrageSwiper' + bonusEvent.bonusId);
				if (bonusEvent.isInstantPay) {
					bonusEventPage.safeSelector('#instantPayDesc').removeAttribute('style');
					bonusEventPage.safeSelector('#bonusTurnoverDes').remove();
					bonusEventPage.safeSelector('a#bonusDetailBtn').remove();
					bonusEventPage.safeSelector('button#bonusDetailBtn').setAttribute('bonusId', bonusEvent.bonusId);

					let prizeDistributionObj = JSON.parse(bonusEvent.prizeDistribution);
					['mini', 'major', 'mega'].forEach(tier => {
						const tierPrizeDistributionObj = prizeDistributionObj[tier];
						let maxPrize = 0;
						for (let prize in tierPrizeDistributionObj.prizes) {
							let arr = prize.split(" ");
							if (arr.length === 1) {
								maxPrize = Math.max(maxPrize, parseFloat(arr[0]))
							}
						}
						tierPrizeDistributionObj.maxPrize = maxPrize;
						let maxTurnover = MathUtil.decimal.multiply(tierPrizeDistributionObj.maxTicketPerPlayer, tierPrizeDistributionObj.turnoverPerTicket);
						tierPrizeDistributionObj.maxTurnover = maxTurnover;
						bonusEventPage.safeSelector(`#${tier}MaxPrize`).innerHTML = NumberFormatUtil.formatNumber(maxPrize, 0);
						bonusEventPage.safeSelector(`#${tier}MaxPrize`).classList.add(PageConfig.chosenCurrency);

						if (bonusEvent.isJackpotMode) {
							let poolAmt = NumberFormatUtil.formatNumber(bonusEvent.jackpotAmountMap[tier] || 0, 2);
							bonusEventPage.safeSelector(`#${tier}JackpotArea > .js_poolAmt`).innerHTML = poolAmt;
						}
					})
					$j(bonusEventPage).data('prizeDistribution', prizeDistributionObj);

					const currentTier = 'mini';
					let currentTierMaxPrize = NumberFormatUtil.formatNumber(prizeDistributionObj[currentTier].maxPrize, 0);
					bonusEventPage.safeSelector('#currentTierMaxPrize').innerHTML = currentTierMaxPrize;
					bonusEventPage.safeSelector('#currentTierMaxPrize').classList.add(PageConfig.chosenCurrency);

					let currentTierMaxTurnover = prizeDistributionObj[currentTier].turnoverPerTicket;
					let currentTierProgressBarStyle = `--progress-current: ${0};--progress-total: ${currentTierMaxTurnover};`;
					let currentTierProgressValue = `${NumberFormatUtil.formatNumber(0, 2)} / ${NumberFormatUtil.formatNumber(currentTierMaxTurnover, 2)}`;

					bonusEventPage.safeSelector('#currentTierProgressBar').style = currentTierProgressBarStyle;
					bonusEventPage.safeSelector('#currentTierProgressValue').innerHTML = currentTierProgressValue;

					bonusEventPage.safeSelector('#ticketArea').innerHTML = `<i class="icon icon-ticket"></i> <span id="ticketTierLabel">${presentHandler.tierLabel[currentTier]}</span> × <span id="ticketCountSpan">0</span>`;
					bonusEventPage.safeSelector('#ticketArea').classList.add(presentHandler.tierClass[currentTier]);
					if (PageConfig.isLoggedIn) {
						bonusEventPage.addEventListener("pointerover", e => {
							const from = e.relatedTarget;
							// 不是從自己的內部來
							if (!from || !bonusEventPage.contains(from)) {
								renderInstantPayTicketInfo(bonusEvent.bonusId);
							}
						});
					}
				} else {
					bonusEventPage.safeSelector('#instantPayDesc').remove();
					bonusEventPage.safeSelector('#bonusDetailBtn').setAttribute('bonusId', bonusEvent.bonusId);
					bonusEventPage.safeSelector('#bonusTurnoverDes').innerHTML = bonusEvent.infoHtml;
				}
				bonusEventPage.setAttribute('presentType', bonusEvent.presentType);
				bonusEventPage.setAttribute('presentPrizeNum', bonusEvent.presentPrizeNum);
				//build result area
				presentHandler.buildResultArea(bonusEvent, bonusTemplate, bonusEventPage.safeSelector('#bonusEventResultWrapper'));

				//如果沒有機會遊戲
				if ('{}' == (bonusEvent.miniGamePrizeDistribution + '')) {
					bonusEventPage.classList.add('no-chance');
					bonusEventPage.dataset.minigame = false;
				} else {
					bonusEventPage.dataset.minigame = true;
				}

				let getTicketImg = bonusEventPage.querySelectorAll('.bonus-img');
				getTicketImg.forEach(function (btn) {
					btn.setAttribute('bonusId', bonusEvent.bonusId);
				});

				let bonusEventGameWrapper = bonusEventPage.safeSelector('#bonusEventGameWrapper');
				bonusEventGameWrapper.classList.add('num-' + bonusEvent.requiredGameList.length);
				// 建立需求遊戲清單的遊戲
				if (bonusEvent.presentType === 'JACKPOT_INSTANT_PAY') {
					buildBonusEventGameWrapper(bonusEvent, 'requiredGameList', bonusEventGameWrapper,
						bonusTemplate.safeSelector('#bonusEventRebateGameTemplate'), presentHandler.gameTagId);
				} else {
					buildBonusEventGameWrapper(bonusEvent, 'requiredGameList', bonusEventGameWrapper, bonusTemplate.safeSelector('#bonusEventGameTemplate'),
						bonusEvent.skinName ? presentHandler.gameTagId[bonusEvent.skinName] : presentHandler.gameTagId);
				}
				// 建立挑戰遊戲清單的遊戲
				if (bonusEvent.isAllowChallenge) {
					buildBonusEventGameWrapper(bonusEvent, 'challengeGameList',
						bonusEventPage.safeSelector('#challengeGameWrapper'), bonusTemplate.safeSelector('#bonusEventGameTemplate'));
				}

				if (bonusEvent.isAllowRankReward) {

					let rankRewardSettingJSON = JSON.parse(bonusEvent.rankRewardSetting);
					for (let key in rankRewardSettingJSON) {

						let reward = bonusEventPage.safeSelector('#rankReward').safeSelector("#" + key + "Reward");
						reward.setAttribute('bonusId', bonusEvent.bonusId);
						reward.setAttribute('rankRewardSetting', rankRewardSettingJSON[key]);
						//如果有龍虎榜徽章設定，移除不讓玩家點選的遮罩
						reward.classList.remove("no-ticket");
					}

					if (bonusEvent.rankRecordMedal) {

						//有勳章才顯示
						if (bonusEvent.rankRecordMedal.dailyMedalCount != 0 ||
							bonusEvent.rankRecordMedal.weeklyMedalCount != 0 ||
							bonusEvent.rankRecordMedal.monthlyMedalCount != 0) {
							bonusEventPage.safeSelector('#bonusGroup').style.display = '';
							bonusEventPage.safeSelector('#rankReward').style.display = '';
							bonusEventPage.classList.remove("no-tournament");

							if (bonusEvent.rankRecordMedal.dailyMedalCount == 0) {
								bonusEventPage.safeSelector('#dailyCheckIn').classList.add('no-ticket');
							}
							if (bonusEvent.rankRecordMedal.weeklyMedalCount == 0) {
								bonusEventPage.safeSelector('#weeklyReward').classList.add('no-ticket');
							}
							if (bonusEvent.rankRecordMedal.monthlyMedalCount == 0) {
								bonusEventPage.safeSelector('#monthlyReward').classList.add('no-ticket');
							}
							bonusEventPage.safeSelector('#dailyRewardCnt').innerText = bonusEvent.rankRecordMedal.dailyMedalCount;
							bonusEventPage.safeSelector('#weeklyRewardCnt').innerText = bonusEvent.rankRecordMedal.weeklyMedalCount;
							bonusEventPage.safeSelector('#monthlyRewardCnt').innerText = bonusEvent.rankRecordMedal.monthlyMedalCount;
						}
					}

					if(bonusEvent.presentType == 'GOLDEN_EGG'){
						let rankRewardTemplate =
							`<div class="txt-balance ${PageConfig.chosenCurrency}" id="goldenEggWinBonus" style="display:none"></div>
									<div class="slot-box" id="winAreaRankRewardSlot" style="display:none">
										<div id="stage" class="tournament-slot">
											<div id="rotate" class="slotNum">
												<div id="ring1" class="ring"></div>
											</div>
											<img class="slot-object" alt="" src="${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/GOLDENEGG/tournament-slot.webp"/>
										</div>
									</div>`;
						let outerWrapperId = bonusEvent.skinName == 'egg'?`eggWinAreaWrapper`:'boxWinArea';
						let winAreaWrapper = document.getElementById(outerWrapperId);
						if(winAreaWrapper && !winAreaWrapper.querySelector('#winAreaRankRewardSlot')){
							winAreaWrapper.insertAdjacentHTML('afterbegin',rankRewardTemplate);
						}
					}
				}
				let gameHallDiv = document.getElementById('gameHallDiv');
				if (gameHallDiv) {
					//gameHallDiv.appendChild(bonusEventPage);
					document.body.appendChild(bonusEventPage);
				} else {
					document.body.appendChild(bonusEventPage);
				}
				// keep event information
				bonusEventPage.safeSelector('#platform').value = bonusEvent.platform;
				if (bonusEvent.isAllowChallenge) {
					bonusEventPage.safeSelector('#bonusMultiplier').value = bonusEvent.bonusMultiplier;
					bonusEventPage.safeSelector('#turnoverMultiplier').value = bonusEvent.turnoverMultiplier;
					bonusEventPage.safeSelector('#challengeExpireHours').value = bonusEvent.challengeExpireHours;
					bonusEventPage.safeSelector('#redeemDeadlineDate').value = bonusEvent.redeemDeadlineDate;
					bonusEventPage.safeSelector('#multiplyHtml').value = bonusEvent.multiplyHtml;
					BonusEventHandler.challengeIncludeGame[bonusEvent.bonusId] = bonusEvent.challengeGameList.map(game => game.gameCode);
				}
				// TODO 可以把倒數計時邏輯放到BonusEventHandler
				if (bonusEvent.presentType !== 'JACKPOT_INSTANT_PAY') {
					let imgPostfix = PageConfig.gameHallType.startsWith('RWD') ? '-RWD' : '-s';
					if (bonusEvent.presentType.startsWith('RAFFLE')) {
						imgPostfix = '';
					}
					let $timePageWrapper = $j(bonusEventPage).find('#timePageWrapper');
					if (bonusEvent.presentType !== 'SIGNUP' && bonusEvent.presentType !== 'GOLDEN_EGG') {
						if (bonusEvent.presentType !== 'MARIOSLOT') {
							let presentTypePrefix = bonusEvent.presentType.split('_')[0];
							const imgFilePathAndName = presentTypePrefix + '/' + presentTypePrefix.toLowerCase();
							$timePageWrapper.append(
								$j('<img src="' + PageConfig.imagePrefix + '/theme/images/src-common/BONUSEVENT-img/' + imgFilePathAndName + imgPostfix + '.webp" alt>'));
						} else {
							$timePageWrapper.append(
								$j('<img src="' + PageConfig.imagePrefix + '/theme/images/src-common/BONUSEVENT-img/MARIO/monopoly' + imgPostfix + '.webp" alt>'));
						}
					}
					if (!bonusEvent.isEnd) {
						let expireTime = DateUtil.getLocalDate(bonusEvent.endDate + ':00:00');
						if (bonusEvent.presentType != 'SIGNUP' &&
							bonusEvent.presentType != 'DAILY_MISSION') {
							if (BSGameHallStickerTime === undefined) {
								BSGameHallStickerTime = expireTime;
							} else if (expireTime < BSGameHallStickerTime) {
								BSGameHallStickerTime = expireTime;
							}
						}
						CountDownUtil.countToTime({
							'countArea': $timePageWrapper.find('span'),
							'expireTime': expireTime,
							'expireText': 'Draw Time',
							'showHours': true
						});
					} else {
						$timePageWrapper.append($j('<span>Draw Time</span>'));
					}
				}
				//改為批次取回
				if (parseInt(bonusEvent.ticketCount) > 0 && bonusEvent.presentType != 'AUTO_REDEEM'
					&& bonusEvent.presentType != 'DAILY_MISSION' && bonusEvent.presentType != 'JACKPOT_INSTANT_PAY') {
					needRealTimeInfoArray.push(bonusEvent.bonusId);
				}

				//參加的平台，要秀promo標籤(signup 一律不秀)
				if (PageConfig.showPromoGameTypeByPlatform && bonusEvent.presentType != 'SIGNUP') {

					PageConfig.canShowGameTypeList.forEach(gameType => {
						bonusEvent.allGamePlatforms.forEach(platform => {
							if (PageConfig.showPromoGameTypeByPlatform.has(gameType)) {
								let platformSet = PageConfig.showPromoGameTypeByPlatform.get(gameType);
								platformSet.add(platform);
							} else {
								PageConfig.showPromoGameTypeByPlatform.set(gameType, new Set([platform]));
							}
						});
					})
				}

				if (bonusEvent.presentType == 'GOLDEN_EGG') {
					var freeSpinSticker = bonusEventPage.querySelector('#freeSpinSticker');
					if (freeSpinSticker) {
						freeSpinSticker.parentNode.removeChild(freeSpinSticker);
					}
				}
			}
		});

		if(dailyMissionEvent.length > 0){

			dailyMissionEvent.sort((a, b) => new Date(b.updateTime) - new Date(a.updateTime));

			let bonusIds = dailyMissionEvent.map(item => item.bonusId).join(',');
			//各個活動產生專屬遮罩
			//if(!PageConfig.isMobile){
				let backdrop = document.createElement('div');
				backdrop.className = 'page-backdrop';
				backdrop.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this);');
				backdrop.setAttribute('bonusid', bonusIds);
				backdrop.setAttribute('presentType', 'DAILY_MISSION');

				document.body.appendChild(backdrop);
			//}

			let bonusEventPage;
			let presentHandler = BonusEventPresentHandler.getHandler('DAILY_MISSION');


			bonusEventPage = bonusTemplate.safeSelector('#bonusDailyMissionEventPage').cloneNode(true);
			presentHandler.processEvent(dailyMissionEvent, bonusTemplate, bonusEventPage);

			//各自產
			for (const event of dailyMissionEvent) {
				let $bonusPageDiv = $j(bonusEventPage).find(`#PageDiv${event.bonusId}`);
				let wrapper = $bonusPageDiv.find('#cumulativeBoxWrapper');
				let isDragging = false;
				let startX, scrollLeft;
				let preventClick = false; // 控制是否阻止點擊事件

				wrapper.on("mousedown", function(e) {
					isDragging = true;
					startX = e.pageX;
					scrollLeft = wrapper.scrollLeft();
					// Prevent text selection during drag
					e.preventDefault();
				});

				$j(document).on("mouseup", function(e) {
					//if (isDragging) {
					isDragging = false;
					// 在拖曳結束時設置一個短暫的延遲以避免點擊觸發
					setTimeout(function() {
						preventClick = false;
					}, 300); // 延遲時間可以根據需求調整
					//}
				});

				wrapper.on("mousemove", function(e) {
					if (isDragging) {
						e.preventDefault();
						// 拖動期間防止點擊事件觸發
						preventClick = true;
						const mouseX = e.pageX;
						const distance = (mouseX - startX); // 計算滾動距離
						wrapper.scrollLeft(scrollLeft - distance);

					}
				});
				// 建立挑戰遊戲清單的遊戲
				if (event.isAllowChallenge) {
					let $challengeGameWrapper = $bonusPageDiv.find('#challengeGameWrapper');
					if ($challengeGameWrapper.length !== 0) {
						buildBonusEventGameWrapper(event, 'challengeGameList',
							$challengeGameWrapper[0], bonusTemplate.safeSelector('#bonusEventGameTemplate'));
					}
				}

				if(GameHallUtils.isWL()) {
					const promoBanner = $j("#sectionPROMO").find(`a[bonusid="${event.bonusId}"]`);
					if(promoBanner.length > 0){
						promoBanner.attr('bonusId', bonusIds);
					}
				}

				if (PageConfig.showPromoGameTypeByPlatform) {

					PageConfig.canShowGameTypeList.forEach(gameType => {
						event.allGamePlatforms.forEach(platform => {
							if (PageConfig.showPromoGameTypeByPlatform.has(gameType)) {
								let platformSet = PageConfig.showPromoGameTypeByPlatform.get(gameType);
								platformSet.add(platform);
							} else {
								PageConfig.showPromoGameTypeByPlatform.set(gameType, new Set([platform]));
							}
						});
					})
				}
			}
			bonusEventPage.setAttribute('id', 'dailyMissionsPageDiv');
			bonusEventPage.setAttribute('bonusId', bonusIds);
			bonusEventPage.setAttribute('issueType', 1);

			presentHandler.className.split(" ").forEach(function (className) {
				bonusEventPage.classList.add(className);
			})
			if (!PageConfig.isMobile) {
				bonusEventPage.classList.add('iframe-div');
			}
			bonusEventPage.safeSelector('#backBtn').setAttribute('bonusId', bonusIds);
			bonusEventPage.safeSelector('#backBtn').setAttribute('presentType', 'DAILY_MISSION');
			bonusEventPage.safeSelector('#bonusDetailBtn').setAttribute('bonusId', 'dailyMissions');

			//build result area
			presentHandler.buildResultArea(dailyMissionEvent, bonusTemplate, bonusEventPage);

			let gameHallDiv = document.getElementById('gameHallDiv');
			if (gameHallDiv) {
				document.body.appendChild(bonusEventPage);
			} else {
				document.body.appendChild(bonusEventPage);
			}
		}

		//存放在 localstorage
		if (PageConfig.showPromoGameTypeByPlatform) {
			let serializableMap = Array.from(PageConfig.showPromoGameTypeByPlatform).map(([key, value]) => [key, Array.from(value)]);
			localStorage.setItem('showPromoGameTypeByPlatform', JSON.stringify(serializableMap));
		}

		//補rebate 時間
		if(rebateStartDate){
			document.getElementById('rebateDate').innerHTML =
				`${buildRebateTimeDesc(rebateStartDate.toISOString())} - ${buildRebateTimeDesc(rebateEndDate.toISOString())}`;

			//重新排序
			if (PageConfig.rebatePlatformSort && PageConfig.rebatePlatformSort.length > 0) {
				const order = PageConfig.rebatePlatformSort.split(','); // 排序規則
				const orderMap = {};
				order.forEach((platform, index) => {
					orderMap[platform] = index;
				});

				const rebateSection = $j("#rebateSection");
				rebateSection
					.children(".REBATE-box")
					.sort((a, b) => {
						const indexA = orderMap[$j(a).data("platform")] == undefined ? 999 : orderMap[$j(a).data("platform")];
						const indexB = orderMap[$j(b).data("platform")] == undefined ? 999 : orderMap[$j(b).data("platform")];
						return indexA - indexB;
					})
					.appendTo(rebateSection); // 重新附加排序後的元素
			}
		}

		// show bs版的sticker
		if(GameHallUtils.isBS() && bonusEventCount > 0) {
			let sticker = $j('#bonusEventListBtn');
			if(BSGameHallStickerTime){
				CountDownUtil.countToTime({
					'countArea':sticker.find('#timeWrapper'),
					'expireTime': BSGameHallStickerTime,
					'expireText': 'Draw Time',
					'showHours': true
				});
			}
			sticker.find('#bonusNum').text(bonusEventCount);
			$j('#bonusEventListSticker').addClass('num-'+bonusEventCount);
			sticker.show();
		}
		//活動產好後 再給 num-{count} 放在 #bonusEventBannerWrapper 這一層
		if((GameHallUtils.isRWD() || GameHallUtils.isEZ() || GameHallUtils.isNWC()) && bonusEventCount > 0){
			$j("#bonusEventBannerWrapper").addClass('num-'+bonusEventCount);
			if(GameHallUtils.isNWC()){
				$j("#bonusEventCount").html(bonusEventCount);
			}
		}
		if(needRealTimeInfoArray.length != 0){
			BonusEventHandler.getBonusEventRealTimeInfo(needRealTimeInfoArray.join(","))
		}

		//排序 stickers & banners 剩餘時間短的在最前面，Drawtime一律最後面
		BonusEventHandler.banners.sort((a, b) => {
			const aa = $j(a).find("#timeStickerWrapper").text().replace(/:/g, "");
			const bb = $j(b).find("#timeStickerWrapper").text().replace(/:/g, "");
			if(aa == 'Draw Time'){
				return 1;
			}else if (bb == 'Draw Time'){
				return -1;
			}else if(parseInt(aa) > parseInt(bb)){
				return 1;
			}else if (parseInt(aa) < parseInt(bb)){
				return -1;
			}else{
				return 0;
			}
		});
		if(BonusEventHandler.banners.length > 0){
			if(GameHallUtils.isNWC()){
				$j('#bonusEventTab').show();
			}
		}

		BonusEventHandler.stickers.sort((a, b) => {
			const aa = $j(a).find("#timeStickerWrapper").text().replace(/:/g, "");
			const bb = $j(b).find("#timeStickerWrapper").text().replace(/:/g, "");
			if(aa == 'Draw Time'){
				return -1;
			}else if(bb == 'Draw Time'){
				return 1;
			}else if(parseInt(aa) > parseInt(bb)){
				return -1;
			}else if (parseInt(aa) < parseInt(bb)){
				return 1;
			}else{
				return 0;
			}
		});

		for (let element of BonusEventHandler.banners) {
			document.getElementById('bonusEventBannerWrapper').appendChild(element);
		}

		let listSticker = document.getElementById('bonusEventListSticker');
		if (listSticker) {
			for (let element of BonusEventHandler.stickers) {
				element.classList.add('num-' + ++BonusEventHandler.sideEntryCount);
				listSticker.appendChild(element);
			}
		}else{
			console.error(`bonusEventListSticker doesn't exist`);
		}

		//由於改非同步，首頁的tag在這邊放上
		//if(async && !GameHallUtils.isWL()){
		// if(!GameHallUtils.isWL()){
			let gameTagIdMap = BonusEventHandler.gameTagIdMap;
			let htmlTemplate = document.getElementById('HTMLTemplate');

			for(let key in gameTagIdMap){
				if (gameTagIdMap.hasOwnProperty(key)) {
					let subObj = gameTagIdMap[key];
					let platform = key.split(',')[0];
					let gameCode = key.split(',')[1];
					let liList = GameEleCache.get({
						'platform': platform,
						'gameCode': gameCode
					});
					liList.forEach(li => {
						let gameTagArea = li.safeSelector('#gameTagArea');
						for (const subKey in subObj) {
							if (!gameTagArea.querySelector('#' + subKey)) {
								let bonusEventTag = htmlTemplate.querySelector('#' + subKey).cloneNode(true);
								if (subKey === BonusEventPresentHandler.REBATE.gameTagId) {
									li.classList.add('show-rebate');
									bonusEventTag.safeSelector('#tagRebateRatio').innerHTML = document.getElementById('rebateRatio').innerHTML;
								}
								if (!GameHallUtils.isWL() || 'true' !== li.getAttribute('isBonusEventArea')
									|| subKey === BonusEventPresentHandler.REBATE.gameTagId) {
									gameTagArea.appendChild(bonusEventTag);
								}
							}
						}
					});

					let entryGameMap = GameHallHandler?.getEntryGameLiMap?.();
					if (entryGameMap && entryGameMap.has(platform)) {
						let $ul = entryGameMap.get(platform);
						let li = $ul.find('li')[0];
						let gameTagArea = li.safeSelector('#gameTagArea');
						for (const subKey in subObj) {
							if (!gameTagArea.querySelector('#' + subKey)) {
								let bonusEventTag = htmlTemplate.querySelector('#' + subKey).cloneNode(true);
								if (subKey === BonusEventPresentHandler.REBATE.gameTagId) {
									li.classList.add('show-rebate');
									bonusEventTag.safeSelector('#tagRebateRatio').innerHTML = document.getElementById('rebateRatio').innerHTML;
								}
								if (!GameHallUtils.isWL() || 'true' !== li.getAttribute('isBonusEventArea')
									|| subKey === BonusEventPresentHandler.REBATE.gameTagId) {
									gameTagArea.appendChild(bonusEventTag);
								}
							}
						}
					}
				}
			}
		// }
		new Swiper(".swiper-egg", {
			loop: true,
			centeredSlides: true,
			slidesPerView: 2,
			slidesPerGroup: 1,
			initialSlide: 0,
			spaceBetween: 0,
			speed: 600,
			loopedSlides: 6, // 重要：設定足夠的循環 slides
			loopFillGroupWithBlank: true, // 填補空白
			touchRatio: 0.5,
			touchAngle: 45,
			resistanceRatio: 1,
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev",
			},
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
			lazy: {
				loadPrevNext: true,
				loadPrevNextAmount: 6
			}
		});

		new Swiper(".swiper-box", {
			loop: true,
			centeredSlides: true,
			slidesPerView: 1,
			spaceBetween: 0,
			initialSlide: 0,
			navigation: {
				nextEl: ".swiper-button-next",
				prevEl: ".swiper-button-prev",
			},
			pagination: {
				el: ".swiper-pagination",
				clickable: true,
			},
		});

		BonusEventHandler.swiper(PageConfig.gameHallType,PageConfig.isMobile);

		if(PageConfig.rebateBonusEntityArr.length > 0){
			BonusEventHandler.initialRebateTimer();

			setInterval(function() {
				let current = new Date();
				//每15分鐘
				if((current.getMinutes() % 15) == 0 && current.getSeconds() == 0){
					BonusEventHandler.initialRebateTimer();
				}
			}, 1000)
		}
	}


	//每個整點調整一次當下應該要顯示的rebate內容跟Timer
	BonusEventHandler.initialRebateTimer = function(){
		let info = getCurrentRebateTimer();
		let closestActiveStartDate = info.get('closestActiveStartDate');
		let closestActiveEndDate = info.get('closestActiveEndDate');
		let isActiveNow = info.get('isActiveNow');
		let isShowComingSoon = info.get('isShowComingSoon');
		let countDownDate;
		if(isActiveNow){
			$j('#rebateSticker').removeClass('coming-soon');
			$j('#rebateSticker').show();
			countDownDate = closestActiveEndDate;
		}else if(isShowComingSoon){
			$j('#rebateSticker').addClass('coming-soon');
			$j('#rebateSticker').show();
			countDownDate = closestActiveStartDate;
		}else{
			$j('#rebateSticker').hide();
			$j('#rebateModalCloseBtn').click();
		}
		if(GameHallUtils.isBS()){
			let img = $j('#rebateSticker').find('img.stickerimg');
			if(isActiveNow){
				img.attr('src', img.attr('rebateNow'));
			}else if(isShowComingSoon){
				img.attr('src', img.attr('comingSoon'));
			}
		}
		if(countDownDate) {
			CountDownUtil.countToTime({
				'countArea': $j('#rebateSticker').find('#timeStickerWrapper'),
				'expireTime': countDownDate,
				'expireText': 'Draw Time',
				'showHours': true,
				'wrapSpan': true
			});
		}
	}

	function getCurrentRebateTimer(){
		let currentDate = new Date();
		let tomorrowDate = new Date().setDate(currentDate.getDate()+1);
		let timezoneOffset = new Date().getTimezoneOffset();
		let offsetHours = parseFloat(MathUtil.decimal.divide(timezoneOffset, 60));

		let isActiveNow = false;
		let isShowComingSoon = false;
		let closestActiveEndDate = new Date(2099, 11, 25, 12, 0, 0);
		let closestActiveStartDate = new Date(2099, 11, 25, 12, 0, 0);

		for(let i = 0; i < PageConfig.rebateBonusEntityArr.length; i++){
			let rebateEvent = PageConfig.rebateBonusEntityArr[i];

			if(rebateEvent.activeHoursPeriodList.length > 0) {
				let eventStartDate = DateUtil.getLocalDate(rebateEvent.startDate + ':00:00');
				let innerFlag = false;
				for (let i = 0; i < rebateEvent.activeHoursPeriodList.length; i++) {
					let period = rebateEvent.activeHoursPeriodList[i];
					let startHour = period.startHour;
					let endHour = period.endHour;

					let localStart = new Date(currentDate);
					localStart.setHours(startHour, 0, 0);
					localStart.addHours(-8 - offsetHours);
					let localEnd;
					if (startHour > endHour) {
						localEnd = new Date(tomorrowDate);
						localEnd.setHours(endHour, 0, 0);
					} else {
						localEnd = new Date(currentDate);
						localEnd.setHours(endHour, 0, 0);
					}
					localEnd.addHours(-8 - offsetHours);
					/*rebateNow條件, 要符合當前時間
					* 1. 要在活動的startDate之後
					* 2. 要在period的起始日期之後
					* 3. 要在period的結束以前
					* */
					if (currentDate >= localStart && currentDate < localEnd && currentDate >= eventStartDate) {
						isActiveNow = true;
						innerFlag = true;
						//rebate now倒數,快結束得先倒數
						closestActiveEndDate = closestActiveEndDate < localEnd ? closestActiveEndDate : localEnd;
					}
					let tmpDate = new Date(localStart);
					tmpDate.addHours(-2);
					let twoHourBeforeStartDate = new Date(eventStartDate);
					twoHourBeforeStartDate.addHours(-2);
					/*coming-soon顯示條件, 要符合當前時間
					* 1. 要在活動的startDate兩小時前之後
					* 2. 要在period的起始日期兩小時前之後
					* 3. 要在period的結束以前
					* 4. period起始時間要在活動開始日期之後
					* */
					if(currentDate >= twoHourBeforeStartDate && currentDate >= tmpDate && currentDate < localStart && localStart >= eventStartDate){
						isShowComingSoon = true;
					}
					//coming soon倒數, 用最靠近的時間計算
					let temp = closestActiveStartDate < localStart ? closestActiveStartDate : localStart;
					closestActiveStartDate = temp >= eventStartDate && temp >= currentDate ? temp : closestActiveStartDate;
				}
				//有開activePeriod的rebate活動, 如果正在active, 處理畫面顯示 : 移除coming soon & li加on
				let selectorId ='PageDiv' + rebateEvent.bonusId;
				let ele = $j('#'+selectorId);
				if(innerFlag){
					ele.removeClass('coming-soon');
					ele.find('#comingSoonTxt').hide();
					ele.find('#activeHoursPeriodDiv li').each(function(){
						$j(this).removeClass('on');
						let periodStart = parseInt($j(this).attr('period-start'));
						let periodEnd = parseInt($j(this).attr('period-end'));
						let currentHourMinute = parseInt(currentDate.getHours() + '' + (currentDate.getMinutes() < 10 ? '0'+currentDate.getMinutes() : currentDate.getMinutes()));
						if(periodStart > periodEnd){ //代表跨日
							if(currentHourMinute >= periodStart || currentHourMinute < periodEnd){
								$j(this).addClass('on');
							}
						}else{
							if(currentHourMinute >= periodStart && currentHourMinute < periodEnd){
								$j(this).addClass('on');
							}
						}
					});
				}else{
					ele.addClass('coming-soon');
					ele.find('#comingSoonTxt').show();
					ele.find('#activeHoursPeriodDiv li').each(function() {
						$j(this).removeClass('on');
					});
				}
			}else{
				let endDate = DateUtil.getLocalDate(rebateEvent.endDate + ':00:00');
				let startDate = DateUtil.getLocalDate(rebateEvent.startDate + ':00:00');

				closestActiveEndDate = closestActiveEndDate > endDate ? endDate : closestActiveEndDate;
				let tmpDate = new Date(startDate);
				tmpDate.addHours(-2);
				if(currentDate >= tmpDate){ //如果當下小時在任意組startHour兩小時內, 就算coming soon
					isShowComingSoon = true;
				}
				closestActiveStartDate = closestActiveStartDate < startDate ? closestActiveStartDate : startDate;
				if(currentDate >= startDate && currentDate < endDate){
					isActiveNow = true;
				}
			}
		}
		let map = new Map();
		map.set('closestActiveStartDate', closestActiveStartDate);
		map.set('closestActiveEndDate', closestActiveEndDate);
		map.set('isActiveNow', isActiveNow);
		map.set('isShowComingSoon', isShowComingSoon);
		return map;
	}

	function showDailyMissionEventPage(bonusEvents){

		let page = $j('#dailyMissionsPageDiv');
		let presentHandler = BonusEventPresentHandler.getHandler('DAILY_MISSION');
		page.addClass('active');

		totalTicketCount = bonusEvents.reduce((total, item) => {
			return total + (parseInt(item.ticketCount, 10) || 0); // 確保值為數字，避免 NaN
		}, 0);
		page.attr('ticketCount', totalTicketCount);

		let hasBonusPoint = false;
		let canShowMall = false;
		let responsStatus = 200;
		let bonusIds = '';
		let hasFreeSpinEvent = false
		let playerPoint = 0;

		for (const event of bonusEvents) {
			if(!hasBonusPoint && event.hasOwnProperty('playerPoint')){
				hasBonusPoint = true;
				playerPoint = NumberFormatUtil.formatNumber(event.playerPoint.toString(), 0);
			}

			if(!canShowMall){
				canShowMall = event.canShowMall;
			}

			if(!hasFreeSpinEvent){
				hasFreeSpinEvent = event.isFreeSpinEvent;
			}

			if(event.status != 200){
				responsStatus = event.status;
			}
			bonusIds += (bonusIds ? ',' : '') + event.bonusId;
		}

		if(hasBonusPoint){

			page.addClass('bonusPoints');

			// 檢查是否已經存在該 HTML，如果不存在則添加
			if (page.find('.bonusPoints-entrance').length === 0) {

				// 獲取模板內容並克隆
				let template = document.getElementById('bonusPointTemplate');
				let clone = template.content.cloneNode(true);
				clone.id = bonusId + "_pont";

				// 替換模板中的特定元素內容
				let pointElement = clone.querySelector('#point');
				pointElement.textContent = playerPoint;

				// 將克隆的內容插入到 page 中的第一個位置
				page.prepend(clone);
			}else{
				page.find('.bonusPoints-entrance #point')[0].textContent = playerPoint;
			}
			let shopButton = page.find('#shopBtn')[0]
			if (shopButton) {
				shopButton.setAttribute('canShowMall', canShowMall);
			}
		}else{
			page.removeClass('bonusPoints');
			// 移除 .bonusPoints-entrance
			page.find('.bonusPoints-entrance').remove();
		}


		$j('body').addClass('bonusevent-open');
		PopupUtil.pushPopupMap(bonusIds, page);
		//if(!PageConfig.isMobile){
			$j('.page-backdrop[bonusid="' + bonusIds + '"]').addClass('show');
		//}

		if(responsStatus == '500') {
			page.find('#bonusTurnoverDes').html('Whoops, something went wrong, please contact your upline.');
			return
		}

		if(GameHallUtils.isRWD() || GameHallUtils.isWL()){
			if(!hasFreeSpinEvent && page.find('#freeSpinSticker').length > 0){
				page.find('#freeSpinSticker').remove();
			}
		}else if(hasFreeSpinEvent && page.find('#innerFreeSpinStiker').length == 0){

			if (window.FreeSpinHandler) {
				if(GameHallUtils.isBS()){
					if(Object.keys(FreeSpinHandler.freeSpinData).length > 0) {
						let bsInnerFreeSpinSticker =
							`<div class="freeSpinTag BS" id="innerFreeSpinStiker" onclick="PopupUtil.openModal('#freeSpinList')">
								<img src="${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/FREESPIN/freeSpinTag_bs.webp" alt="freeSpinTag">
								<div class="txt-balance freespin-total ${PageConfig.chosenCurrency}">
								${$j('#freeSpinTotalBalance').text()}
								</div>
							</div>`;
						page.prepend(bsInnerFreeSpinSticker);
					}
				}else if(GameHallUtils.isEZ()){
					if(Object.keys(FreeSpinHandler.freeSpinData).length > 0) {
						let bsInnerFreeSpinSticker =
							`<div class="freeSpinTag EZ" id="innerFreeSpinStiker" onclick="GameHallHandler.clickFreeSpinSticker()">
								<img src="${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/FREESPIN/freeSpinTag_ez.webp" alt="freeSpinTag">
								<div id="freeSpinTotalAmt" class="txt-balance freespin-total ${PageConfig.chosenCurrency}">
								${GameHallHandler.freeSpinTotalAmt}
								</div>
							</div>`;
						page.prepend(bsInnerFreeSpinSticker);
					}
				}else {
					page.prepend(FreeSpinHandler.cloneSticker());
				}
			}
		}

		presentHandler.handleDailyMission(bonusEvents, page);

		for (const event of bonusEvents) {
			page.find(`#PageDiv${event.bonusId}`).find('#cumulativeInfo').on('click', function () {
					this.classList.add("show");
					let backDrop = $j("#dailyMissionsPageDiv").find("#dailyBackdrop");
					backDrop.addClass('show');
					backDrop.data('taskid', event.bonusId + "Div");
			});
		}

	}

	function showBonusEventPage(response, bonusId){
		let page = $j(`#PageDiv${bonusId}`);
		page.attr('ticketCount',response.ticketCount);
		page.attr('challengeCount',response.challengeCount);
		page.find('#ticketCountSpan').html(response.ticketCount);
		page.addClass('active');

        if(response.hasOwnProperty('playerPoint')){
            page.addClass('bonusPoints');

			const playerPoint = NumberFormatUtil.formatNumber(response.playerPoint.toString(), 0);
            // 檢查是否已經存在該 HTML，如果不存在則添加
            if (page.find('.bonusPoints-entrance').length === 0) {
               
                // 獲取模板內容並克隆
                let template = document.getElementById('bonusPointTemplate');
                let clone = template.content.cloneNode(true);
				clone.id = bonusId + "_pont";

                // 替換模板中的特定元素內容
                let pointElement = clone.querySelector('#point');
                pointElement.textContent = playerPoint;

                // 將克隆的內容插入到 page 中的第一個位置
                page.prepend(clone);
            }else{
				page.find('.bonusPoints-entrance #point')[0].textContent = playerPoint;
			}
			let shopButton = page.find('#shopBtn')[0]
			if (shopButton) {
				shopButton.setAttribute('canShowMall', response.canShowMall); 
    		}

        } else {
            page.removeClass('bonusPoints');
            // 移除 .bonusPoints-entrance
            page.find('.bonusPoints-entrance').remove();
        }

		$j('body').addClass('bonusevent-open');
		let presentHandler = BonusEventPresentHandler.getHandler(response.presentType);
		PopupUtil.pushPopupMap(bonusId, page);
		//if(!PageConfig.isMobile){
			$j('.page-backdrop[bonusid="' + bonusId + '"]').addClass('show');
		//}

		if(response.status == '500') {
			page.find('#bonusTurnoverDes').html('Whoops, something went wrong, please contact your upline.');
			return
		}
        if(GameHallUtils.isRWD() || GameHallUtils.isWL()){
			if(!response.isFreeSpinEvent && page.find('#freeSpinSticker').length > 0){
				page.find('#freeSpinSticker').remove();
			}
        }else if(response.isFreeSpinEvent && page.find('#innerFreeSpinStiker').length == 0){

			if (window.FreeSpinHandler) {
				if(GameHallUtils.isBS()){
					if(Object.keys(FreeSpinHandler.freeSpinData).length > 0) {
						let bsInnerFreeSpinSticker =
							`<div class="freeSpinTag BS" id="innerFreeSpinStiker" onclick="PopupUtil.openModal('#freeSpinList')">
								<img src="${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/FREESPIN/freeSpinTag_bs.webp" alt="freeSpinTag">
								<div class="txt-balance freespin-total ${PageConfig.chosenCurrency}">
								${$j('#freeSpinTotalBalance').text()}
								</div>
							</div>`;
						page.prepend(bsInnerFreeSpinSticker);
					}
				}else if(GameHallUtils.isEZ()){
					if(Object.keys(FreeSpinHandler.freeSpinData).length > 0) {
						let bsInnerFreeSpinSticker =
							`<div class="freeSpinTag EZ" id="innerFreeSpinStiker" onclick="GameHallHandler.clickFreeSpinSticker()">
								<img src="${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/FREESPIN/freeSpinTag_ez.webp" alt="freeSpinTag">
								<div id="freeSpinTotalAmt" class="txt-balance freespin-total ${PageConfig.chosenCurrency}">
								${GameHallHandler.freeSpinTotalAmt}
								</div>
							</div>`;
						page.prepend(bsInnerFreeSpinSticker);
					}
				}else {
					page.prepend(FreeSpinHandler.cloneSticker());
				}
			}
        }
		if(response.isEnd == 'true'){
			page.find('#bonusTurnoverDes').html('All tickets must redeem before ' + response.redeemDeadlineDateDesc);
		}else {
			//page.find('#bonusTurnoverDes').html(response.infoHtml);
			page.find('#eventTurnover').html(NumberFormatUtil.formatNumber(response.eventTurnover, 2)).addClass(PageConfig.chosenCurrency);
			page.find('#todayTickets').html(NumberFormatUtil.formatNumber(response.todayTickets, 0));
			page.find('#todayRedeemedTickets').html(NumberFormatUtil.formatNumber(response.todayRedeemedTickets, 0));
			page.find('#needMoreTurnover').html(NumberFormatUtil.formatNumber(response.needMoreTurnover, 2)).addClass(PageConfig.chosenCurrency);
			page.find('#earnTicket').html(parseInt(response.todayTickets) < parseInt(response.maxTicketPerPlayer) ? '1' : '0');
		}
		if (response.instantPayTicketInfo) {
			BonusEventPresentHandler.showInstantPayTicketInfo(page, response);
		}
		if(PageConfig.isLoggedIn && response.hasOwnProperty('rankRecordMedal')){
			if(response.rankRecordMedal.dailyMedalCount == 0){
				page.find('#dailyCheckIn').addClass('no-ticket');
				page.find('#rankRewardSlot').removeClass('daily');
			}
			if(response.rankRecordMedal.weeklyMedalCount == 0){
				page.find('#weeklyReward').addClass('no-ticket');
				page.find('#rankRewardSlot').removeClass('weekly');
			}
			if(response.rankRecordMedal.monthlyMedalCount == 0){
				page.find('#monthlyReward').addClass('no-ticket');
				page.find('#rankRewardSlot').removeClass('monthly');
			}
			page.find('#dailyRewardCnt').text(response.rankRecordMedal.dailyMedalCount);
			page.find('#weeklyRewardCnt').text(response.rankRecordMedal.weeklyMedalCount);
			page.find('#monthlyRewardCnt').text(response.rankRecordMedal.monthlyMedalCount);
		}
		presentHandler.showBonusEventPage(page, response);

		if(response.takenTicketId){
			BonusEventHandler.showChallengeChoiceDiv(response, bonusId);
			let challengeChoiceDiv = $j('#challengeChoiceDiv');
			challengeChoiceDiv.data('response', response);
			challengeChoiceDiv.data('formData', {
				bonusId: bonusId,
				pickedBox: response.remark,
				rankRewardPercentage : response.rankRewardPercentage||''
			});
			return;
		}
        if (PageConfig.isLoggedIn
			&& response.presentType !== 'DAILY_MISSION'
			&& response.presentType !== 'REBATE'
			&& response.presentType !== 'JACKPOT_INSTANT_PAY') {
		    getLatestRedeemTicket([bonusId]);
        }
	}

	BonusEventHandler.showChallengeChoiceDiv = function(response, bonusId){
		let page = $j(`#PageDiv${bonusId}`);
		let bonusMultiplier = page.find('#bonusMultiplier').val();
		let turnoverMultiplier = page.find('#turnoverMultiplier').val();
		let multiplyHtml = page.find('#multiplyHtml').val();

		let multipliedBonus = 0
		let multipliedTurnover = 0
		let award = 0;

		// show choose page
		let challengeChoiceDiv = $j('#challengeChoiceDiv');
		if (challengeChoiceDiv.length == 0) {
			challengeChoiceDiv = $j(challengeChoiceDivTemplate).appendTo($j('body'));
		}
		
		//有使用龍虎榜勳章
		if(response.rankRewardPercentage){
			award = MathUtil.decimal.add(response.award, response.rankRewardAmount);
			multipliedBonus = MathUtil.decimal.multiply(award, bonusMultiplier);
			multipliedTurnover = MathUtil.decimal.multiply(multipliedBonus, turnoverMultiplier);
			challengeChoiceDiv.find('#originalRankRewardDesc').text(response.award + " + " + response.rankRewardPercentage + "%");
			challengeChoiceDiv.find('#multipliedRankRewardDesc').text(MathUtil.decimal.multiply(response.award, bonusMultiplier) + " + " + response.rankRewardPercentage + "%")
		}else{
			award = response.award;
			multipliedBonus = MathUtil.decimal.multiply(response.award, bonusMultiplier);
			multipliedTurnover = MathUtil.decimal.multiply(multipliedBonus, turnoverMultiplier);
		}

		challengeChoiceDiv.find('#ticketId').val(response.takenTicketId);
		challengeChoiceDiv.find('#bonusId').val(bonusId);
		challengeChoiceDiv.find('#bonusMultiplierText').text(bonusMultiplier)
		challengeChoiceDiv.find('#originalBonus').text(award);
		challengeChoiceDiv.find('#directRedeemText').text('No challenge, collect the bonus directly.');

		challengeChoiceDiv.find('#challengeText').html(multiplyHtml);
		challengeChoiceDiv.find('#multipliedBonus').text( NumberFormatUtil.formatNumber(multipliedBonus, -1) );
		challengeChoiceDiv.find('#multipliedTurnover').text( NumberFormatUtil.formatNumber(multipliedTurnover, 2) );
		PopupUtil.openModal('#challengeChoiceDiv');
	}

	BonusEventHandler.chooseChallenge = once(_chooseChallenge, 2000);
	function _chooseChallenge(isAcceptChallenge){
		let challengeChoiceDiv = $j('#challengeChoiceDiv');
		let bonusId = challengeChoiceDiv.find('#bonusId').val();
		if(isAcceptChallenge){
			BonusEventHandler.closeFancyAlert();
		}

		postAjax({
			url: PageConfig.challengeBonusTicket,
			data: {
				ticketId: challengeChoiceDiv.find('#ticketId').val(),
				bonusId: bonusId,
				isAcceptChallenge: !!isAcceptChallenge
			},
			success: function(response){
				challengeChoiceDiv.modal('hide');
				if (response.error) {
					BonusEventHandler.closeFancyAlert();
					AlertHandler.showErrorAlert(response.error, function(){
						window.location.reload();
					});
					return;
				}

				let page = $j(`#PageDiv${bonusId}`);


				BonusEventHandler.putAudio('challengeChoice', '/theme/media/music/challengeChoice.mp3');
				BonusEventHandler.playAudio('challengeChoice');
				let handler = BonusEventPresentHandler.getHandler(page.attr('presentType'));

				if(isAcceptChallenge){
					BonusEventHandler.closeFancyAlert();
					AlertHandler.showAlert('Accept Challenge' , function(){
						BonusEventHandler.getBonusEventRealTimeInfo(bonusId);
						//接受挑戰後要把lock解除
						handler.onCloseFancyAlert(page);
					});
				}else{
					handler.takeTicketResult(page, challengeChoiceDiv.data('response'), challengeChoiceDiv.data('formData'));
				}

			},
			loadingMask: '#loading'
		});
	}

	/****** bonus event ******/
	BonusEventHandler.sideEntryCount = 0;
	let rebateStickerCount = 0;
	let rebateActivityCount = 0;

	BonusEventHandler.buildEntrance = function(bonusEvent, gameHallType, isMobile){
		let bonusEventSticker; // TODO rename to eventEntrance
		if(bonusEvent.presentType == 'REBATE'){
			rebateActivityCount++;
			let platformImg = '<div class="platform-img '+bonusEvent.platform+'"><img src="'+PageConfig.imagePrefix+'/theme/images/src-common/PLATFORM-img/100x100/'+bonusEvent.platform+'-logo.webp"></div>';
			if(rebateStickerCount < 1){

				bonusEventSticker = bonusTemplate.safeSelector('#rebateStickerTemplate').cloneNode(true);
				bonusEventSticker.setAttribute('id', 'rebateSticker');
				bonusEventSticker.setAttribute('presentType', 'REBATE');
				bonusEventSticker.safeSelector('#stickerRebateRatio').innerHTML = `+${bonusEvent.prizeJson.rebateRatio}%`;
				//TODO #REBATE 待確認
				//BonusEventHandler.stickers.push(bonusEventSticker);
				bonusEventSticker.safeSelector('#comingSoonPlatform').innerHTML = platformImg;

				if(GameHallUtils.isBS()){
					document.getElementById('subMenu').appendChild(bonusEventSticker);
					let subMenu = $j('#subMenu');
					if(!subMenu.is(':visible')){
						subMenu.show();
					}
					rebateStickerCount++;
				} else {
					let listSticker = document.getElementById('bonusEventListSticker');
					if (listSticker) {
						listSticker.appendChild(bonusEventSticker);
						rebateStickerCount++;
					}else{
						console.error(`bonusEventListSticker doesn't exist`);
					}
				}
				return bonusEventSticker;
			}else{
				bonusEventSticker = $j('#rebateSticker');
				bonusEventSticker.find('#comingSoonPlatform').append(platformImg);
			}
			$j('#rebateSticker').find('#comingSoonPlatform').removeClass().addClass('show-platform num-'+rebateActivityCount);
			return;
		}else if(bonusEvent.presentType === 'JACKPOT_INSTANT_PAY'){
			bonusEventSticker = bonusTemplate.safeSelector('#jackpotInstantPayStickerTemplate').cloneNode(true);
		}else if(GameHallUtils.isWL()){
            bonusEventSticker = document.createElement("a");
            bonusEventSticker.href = "javascript:void(0);";
            if (bonusEvent.presentType == "GOLDEN_EGG") {
                bonusEventSticker.className = `bonusEvent GOLDEN_${bonusEvent.skinName.toUpperCase()}`;
            } else {
                bonusEventSticker.className = `bonusEvent ${bonusEvent.presentType}`;
            }
            bonusEventSticker.setAttribute("onclick", "BonusEventHandler.toggleBonusEvent(this)");
            let presentType = bonusEvent.presentType;
            let platformLogoSrc = `${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp`;
            let eventImgSrc = "";

            if (presentType == "GOLDEN_EGG") {
                eventImgSrc = `${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/GOLDENEGG/${bonusEvent.skinName.toUpperCase()}/gold${bonusEvent.skinName}-WL.webp`;
            } else if (presentType !== "MARIOSLOT") {
                let presentTypePrefix = presentType.split("_")[0];
                const imgFilePathAndName = presentTypePrefix + "/" + presentTypePrefix.toLowerCase();
                eventImgSrc = `${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/${imgFilePathAndName}-WL.webp`;
            } else {
                eventImgSrc = `${PageConfig.imagePrefix}/theme/images/src-common/BONUSEVENT-img/MARIO/mario-WL.webp`;
            }

            let stickerHtml = `
						<div class="show-instant"></div>
		                <i class="txt-platform-name">
		                    <img src="${platformLogoSrc}" />
		                </i>
		                <img src="${eventImgSrc}" alt="" />
		                <div class="show-bonus-event">
		                    <div class="txt" id="timeStickerWrapper">
		                        ::
		                    </div>
		                </div>`;
            bonusEventSticker.innerHTML = stickerHtml;
            bonusEventSticker.setAttribute("id", bonusEvent.bonusId + "Div");
            bonusEventSticker.setAttribute("bonusId", bonusEvent.bonusId);
	
			//WL版要多秀HOT區
            let bonusEventItemWL;
            //整理requiredGame
            let bonusEventGameMap = bonusEvent.requiredGameList.reduce((map, game) => {
                if (!map[game.gameType]) {
                    map[game.gameType] = [];
                }
                map[game.gameType].push(game);
                return map;
            }, {});

            const gameTypes = Object.keys(bonusEventGameMap);
			let targetIndex = 0;
            gameTypes.forEach((gameType) => {
                const games = bonusEventGameMap[gameType];
                //沒有該類型的遊戲不秀
                if (games.length > 0) {
                    let data = {
                        imagePrefixPath: PageConfig.imagePrefix,
                        eventTimeDesc: bonusEvent.eventTimeDesc,
                        grandPrize: NumberFormatUtil.formatNumber(bonusEvent.grandPrize, 0),
                        currency: PageConfig.chosenCurrency,
                        platform: bonusEvent.platform,
                        gameType: gameType,
                        bonusId: bonusEvent.bonusId,
						numClass:games.length,
						targetIndex: targetIndex++,
                    };
                    bonusEventItemWL = $j(TemplateCache.buildHtmlString("bonusEventItemWL", data));
                    $j("#bonusEvent_" + gameType).append(bonusEventItemWL);

                    if (!bonusEvent.isEnd) {
                        let expireTime = DateUtil.getLocalDate(bonusEvent.endDate + ":00:00");
                        CountDownUtil.countToTime({
                            countArea: $j("#bonusEventGroup_" + gameType + "_" + bonusEvent.bonusId).find("#timeStickerWrapper"),
                            expireTime: expireTime,
                            expireText: "Draw Time",
                            showHours: true,
                            wrapSpan: true,
                        });
                    } else {
                        $j("#bonusEventGroup_" + gameType + "_" + bonusEvent.bonusId).find("#timeStickerWrapper").innerHTML = "<span>Draw Time</span>";
                    }

                    games.forEach((game) => {
                        GameHallHandler.buildGame(game, $j(`#${bonusEvent.bonusId}${gameType}UlGameList`)[0], gameType, "bonusEvent");
                    });
                }
            });
		}else if(GameHallUtils.isBS()){
			bonusEventSticker = document.createElement('li');
			bonusEventSticker.className = `${bonusEvent.platform}`;
			bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
			bonusEventSticker.innerHTML = `<img class="show-game" src="${bonusEvent.requiredGameList[0].imgUrl.replace('.webp','-w.webp')}" alt="game icon">
								<div class="show-txt">
									<div class="txt-bonus-tit">TOTAL BONUS</div>
									<div class="txt-bonus ${PageConfig.playerCurrency}">
										<b>${NumberFormatUtil.formatNumber(bonusEvent.grandPrize, 0)}</b>
									</div>
								</div>
								<div class="show-platform-logo">
									<img src="${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp">
								</div>
								<div class="show-instant">
									<div class="txt" id="timeStickerWrapper">
										::
									</div>
								</div>
								<div class="show-bonus-event ${bonusEvent.presentType == 'GOLDEN_EGG'?
									'GOLDEN_'+bonusEvent.skinName.toUpperCase():bonusEvent.presentType}"></div>`;
		}else if(GameHallUtils.isNWC()) {
			bonusEventSticker = document.createElement('li');
			bonusEventSticker.className = `event-default ${bonusEvent.platform}`;
			bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
			let stickerHtml =`
				<div class="show-platform-logo">
					<img src="${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp">
				</div>
				<div class="show-instant">
					<div class="txt" id="timeStickerWrapper">::</div>
				</div>
				<div class="show-bonus-event ${bonusEvent.presentType}"></div>`;
			bonusEventSticker.innerHTML = stickerHtml;
		}else if(bonusEvent.userEntryType == PageConfig.entryType.sticker) {
			bonusEventSticker = bonusTemplate.safeSelector('#bonusEventStickerTemplate').cloneNode(true);
		} else if(bonusEvent.userEntryType == PageConfig.entryType.banner){

			let gameHtml = '';
			if (!GameHallUtils.isRWD()){
				bonusEvent.requiredGameList.forEach(function (game) {
					gameHtml += '<img src="' + GameHallUtils.getImgUrl(game) + '">';
				});
			}
			if((GameHallUtils.isNEW() || GameHallUtils.isOLD() || GameHallUtils.isCA()) && !PageConfig.isMobile){
				bonusEventSticker = document.createElement('li');
				bonusEventSticker.className = 'fix-sticker img-upload';
				bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
				let stickerHtml = 
					'<div class="show-bonus-event">' +
						'<div class="txt" id="timeStickerWrapper">::</div>' +
					'</div>' +
					'<div class="txt-bonus">' +
						'<small>'+I18N.get('player.bonusEvent.text.totalBonus')+'</small>' +
						'<sup class="' + PageConfig.chosenCurrency + '"></sup>' +
						'<b id="stickerTotalBonus"></b>' +
					'</div>' +
					'<div class="event-games">'+
						gameHtml +
				 	'</div>';
				bonusEventSticker.innerHTML = stickerHtml;
			}else if (GameHallUtils.isNEW() || GameHallUtils.isCA()) {
				bonusEventSticker = document.createElement('div');
				bonusEventSticker.className = 'swiper-slide BONUSEVENT';
				bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
				let stickerHtml =
					'<div class="swiper-slide BONUSEVENT">' +
						'<li class="fix-sticker img-upload">' +
							'<div class="show-bonus-event">' +
								'<div class="txt" id="timeStickerWrapper">::</div>' +
							'</div>' +
							'<div class="txt-bonus">' +
								'<small>'+I18N.get('player.bonusEvent.text.totalBonus')+'</small>' +
								'<sup class="' + PageConfig.chosenCurrency + '"></sup>' +
								'<b id="stickerTotalBonus"></b>' +
							'</div>' +
							'<div class="event-games">' +
								gameHtml +
							'</div>' +
						'</li>' +
					'</div>';
				bonusEventSticker.innerHTML = stickerHtml;
			} else if (GameHallUtils.isOLD()) {
				bonusEventSticker = document.createElement('div');
				bonusEventSticker.className = 'swiper-slide BONUSEVENT';
				bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
				let stickerHtml =
					'<div class="swiper-slide">' +
						'<li class="fix-sticker img-upload">' +
							'<div class="show-bonus-event">' +
								'<div class="txt" id="timeStickerWrapper">::</div>' +
							'</div>' +
							'<div class="txt-bonus">' +
								'<small>'+I18N.get('player.bonusEvent.text.totalBonus')+'</small>' +
								'<sup class="' + PageConfig.chosenCurrency + '"></sup>' +
								'<b id="stickerTotalBonus"></b>' +
							'</div>' +
							'<div class="event-games">' +
								gameHtml +
							'</div>' +
						'</li>' +
					'</div>';
				bonusEventSticker.innerHTML = stickerHtml;
			} else if (GameHallUtils.isRWD()) {
				let showPlatformLogo = '';
				if(bonusEvent.presentType === 'GOLDEN_EGG' && bonusEvent.skinName) {
					showPlatformLogo = `GOLDEN_${bonusEvent.skinName.toUpperCase()}`;
				}else{
					showPlatformLogo =  `${bonusEvent.presentType}`;
				}
				bonusEventSticker = document.createElement('li');
				bonusEventSticker.className = bonusEvent.platform;
				bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
				bonusEventSticker.innerHTML =
					'<div class="card">' +
						'<div class="show-platform-logo">'+
						'<img src="https://img.mpsimg.com/theme/images/src-common/PLATFORM-img/120x80-fullname/'+bonusEvent.platform+'-logo.webp">'+
						'</div>'+
						'<div class="show-bonus-event ' + showPlatformLogo + '"></div>' +
						'<div class="card-tit">' +
							'<div class="txt-bonus-tit">'+I18N.get('player.bonusEvent.text.totalBonus')+'</div>' +
							'<div class="txt-bonus ' + PageConfig.chosenCurrency + '">' +
								'<b id="stickerTotalBonus"></b>' +
							'</div>' +
						'</div>' +
						'<div class="txt-clock" id="timeStickerWrapper">::</div>' +
					'</div>';
			} else if (GameHallUtils.isEZ()) {
				let presentTypeClass = '';
				if(bonusEvent.presentType === 'GOLDEN_EGG' && bonusEvent.skinName) {
					presentTypeClass = `GOLDEN_${bonusEvent.skinName.toUpperCase()}`;
				}else{
					presentTypeClass =  `${bonusEvent.presentType}`;
				}
				bonusEventSticker = document.createElement('div');
				bonusEventSticker.className = 'BONUSEVENT';
				bonusEventSticker.setAttribute('onclick', 'BonusEventHandler.toggleBonusEvent(this)');
				bonusEventSticker.innerHTML =
					`<li class="fix-sticker">
						<div class="bonus-event-bg ${presentTypeClass}">
							<div class="show-platform-logo">
								<img src="${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp">
							</div>
							<div class="show-bonus-event">
								<div class="txt" id="timeStickerWrapper">::</div>
							</div>
							<div class="txt-bonus">
								<small>${I18N.get('player.bonusEvent.text.totalBonus')}</small>
								<sup class="${PageConfig.chosenCurrency}"></sup>
								<b id="stickerTotalBonus"></b>
							</div>
						</div>
					</li>`;
			}
		}
		bonusEventSticker.setAttribute('id', bonusEvent.bonusId + 'Div');
		bonusEventSticker.setAttribute('bonusId', bonusEvent.bonusId);

		if (bonusEvent.presentType === 'JACKPOT_INSTANT_PAY') {
			bonusEventSticker.safeSelector('#stickerTotalBonus').innerHTML = NumberFormatUtil.formatNumber(bonusEvent.jackpotAmountMap.jackpotGrandPrize, 0);
		} else {
			bonusEventSticker.safeSelector('#stickerTotalBonus').innerHTML = NumberFormatUtil.formatNumber(bonusEvent.grandPrize, 0);

			if(GameHallUtils.isBS() || GameHallUtils.isWL()){
				//bonusEventSticker.safeSelector('#bgDiv').style.backgroundImage = 'url("//' + bonusEvent.bsBannerUrl + '")';
			} else if(GameHallUtils.isNWC()){
				let showBonusEventDiv = bonusEventSticker.safeSelector('.show-bonus-event');
				showBonusEventDiv.classList.add(bonusEvent.presentType === 'GOLDEN_EGG' ? `GOLDEN_${bonusEvent.skinName.toUpperCase()}` : bonusEvent.presentType);
			} else if(bonusEvent.userEntryType == PageConfig.entryType.sticker) {
				if(bonusEvent.presentType != 'REBATE') {
					bonusEventSticker.classList.add(bonusEvent.platform);
					let showBonusEventDiv = bonusEventSticker.safeSelector('.show-bonus-event');
					showBonusEventDiv.classList.add(bonusEvent.presentType === 'GOLDEN_EGG' ? `GOLDEN_${bonusEvent.skinName.toUpperCase()}` : bonusEvent.presentType);
					const platformLogoContent = `
				<div class="show-platform-logo">  
					<img src="${PageConfig.imagePrefix}/theme/images/src-common/PLATFORM-img/100x100/${bonusEvent.platform}-logo.webp">
				</div>  
				`;
					showBonusEventDiv.insertAdjacentHTML('beforebegin', platformLogoContent);
				}
			}
			if(!bonusEvent.isEnd) {
				let expireTime = DateUtil.getLocalDate(bonusEvent.endDate+':00:00');
				CountDownUtil.countToTime({
					'countArea':$j(bonusEventSticker).find('#timeStickerWrapper'),
					'expireTime': expireTime,
					'expireText': 'Draw Time',
					'showHours': true,
					'wrapSpan': true
				});
			}else{
				bonusEventSticker.safeSelector('#timeStickerWrapper').innerHTML = '<span>Draw Time</span>';
			}
		}
		if (GameHallUtils.isNWC()) {
			BonusEventHandler.banners.push(bonusEventSticker);
		} else if (bonusEvent.userEntryType == PageConfig.entryType.sticker) {
			BonusEventHandler.stickers.push(bonusEventSticker);
		} else if (bonusEvent.userEntryType == PageConfig.entryType.banner) {
			document.getElementById('bonusEventHomeArea').style.display = 'block';
			BonusEventHandler.banners.push(bonusEventSticker);
		}
		return bonusEventSticker;
	}
	
	BonusEventHandler.buildSignupEntrance = function(bonusEvent){
		let bonusEventSticker = bonusTemplate.safeSelector('#bonusEventSignupTemplate').cloneNode(true);
		$j(bonusEventSticker).find('#dateStickerWrapper').text(bonusEvent.startDate + " ~ " + bonusEvent.endDate);
		bonusEventSticker.setAttribute('id', bonusEvent.bonusId + 'Div');
		bonusEventSticker.setAttribute('bonusId', bonusEvent.bonusId);
		document.body.appendChild(bonusEventSticker);
	}

	BonusEventHandler.swiper = function(gameHallType, isMobile){
		console.time('swiper');
		let eventCount = $j('#bonusEventBannerWrapper').children().length;
		if(eventCount <= 0){
			console.timeEnd('swiper');
			return;
		}
		// PC版特殊處理，依Event數量決定是否需要開啟輪播
		let itemCount;
		let enableAutoplayForPC = true;
		if(!isMobile){
			itemCount = (GameHallUtils.isNEW() || GameHallUtils.isOLD()) ? 4 : 3;
			enableAutoplayForPC = eventCount > itemCount;
			if(!enableAutoplayForPC){
				// 元素置中控制
				if(GameHallUtils.isNEW() || GameHallUtils.isOLD()){
					$j('#bonusEventHomeArea').addClass('num-'+eventCount);
				}else if(GameHallUtils.isRWD()){
					// Rwd 版 num-{count} 移動至下兩層(bonus-wrapper)添加
				}else{
					$j('#bonusEventHomeArea').find('.game-list-ul').addClass('num-'+eventCount);
				}
			}
		}

		if(GameHallUtils.isOLD()){
			let swiper = new Swiper("section.BONUSEVENT .swiper", {
				//effect: "cube",
				grabCursor: true,
				centeredSlides: false,
				//loop: true,
				loopFillGroupWithBlank: true,
				breakpoints: {
					320: {
						slidesPerView: 1,
						slidesPerGroup: 1,
						spaceBetween: 10,
					},
					769: {
						slidesPerView: 3,
						slidesPerGroup: 1,
						spaceBetween: 10,
					},
				},

				autoplay: {
					delay: 3500,
					disableOnInteraction: false,
					pauseOnMouseEnter: true,
				},
				lazy: true,
				pagination: {
					el: ".swiper-pagination",
					dynamicBullets: true,
				},
				navigation: {
					nextEl: ".swiper-button-next",
					prevEl: ".swiper-button-prev",
				},
			});
		}else if(GameHallUtils.isNEW()){
			let swiper = new Swiper(".section-BONUSEVENT .swiper", {
				effect: "cube",
				grabCursor: true,
				centeredSlides: true,
				slidesPerView: "auto",
				autoplay: {
					delay: 3000,
					disableOnInteraction: false,
					pauseOnMouseEnter: true,
				},
				lazy: true,
				pagination: {
					el: ".swiper-pagination",
					clickable: true,
				},
				cubeEffect: {
					shadow: true,
				},
			});
		} else if (!GameHallUtils.isRWD()) {
			let autoplay = enableAutoplayForPC ? {
					delay: 5000,
					disableOnInteraction: false,
					pauseOnMouseEnter: true,
				} : false;
			let swiper = new Swiper(".section-BONUSEVENT .swiper", {
				lazy: true,
				autoplay: autoplay,
				breakpoints: {
					320: {
						slidesPerView: 1.1,
						spaceBetween: 8,
						centeredSlides: true,
						slidesPerGroup: 1,
					},
					769: {
						slidesPerView: enableAutoplayForPC ? itemCount : eventCount,
						slidesPerGroup: 1,
						spaceBetween: 10,
					},
				},
				pagination: {
					el: ".swiper-pagination",
					dynamicBullets: true,
				},
			});
		}
		console.timeEnd('swiper');
	}

	let audioMap = {};
	BonusEventHandler.putAudio = (key, immediateSrc)=>{
		let audio = audioMap[key]||'';
		if(audio.constructor.name != 'HTMLAudioElement'){
			audio = new Audio(immediateSrc);
			audioMap[key] = audio;
		}
		if(!audio.src || !audio.src.endsWith(immediateSrc)){
			audio.src = immediateSrc;
		}
	}

	BonusEventHandler.getAudio = (key)=>{
		let audio = audioMap[key]||'';
		if(audio.constructor.name != 'HTMLAudioElement'){
			throw 'no audio:'+key;
		}
		if(!audio.src){
			throw 'no src:'+key;
		}
		return audio;
	}

	BonusEventHandler.playAudio = (key)=>{
		return new Promise((resolve=>{
			let audio = BonusEventHandler.getAudio(key);
			audio.onended = resolve;
			audio.play().catch((e)=>{
				console.log(e)
			});
		}))
	}

	BonusEventHandler.animateNum = function (displayEle, newValue, duration) {
		
		//預設2位小數點
		let decimal_places = 2;
		
		//移除多餘的0
		//let newValueStr = newValue.toString().replace(/\.?0+$/, '');
		//let decimalIndex = newValueStr.indexOf('.');

		// if(decimalIndex != -1){
		// 	decimal_places = newValueStr.length - decimalIndex - 1;
		// }

		let initValue = $j(displayEle).text();
		if(!initValue){
			$j(displayEle).text(newValue);
			return;
		}

		initValue = initValue.replace(/\$|\,/g, '');
		newValue = newValue.replace(/\$|\,/g, '');
		//if current number > new number , ui not animate
		if (newValue - initValue <= 0) {
			$j(displayEle).text(NumberFormatUtil.formatNumber(newValue, decimal_places));
			return;
		}

		let decimal_factor = Math.pow(10, decimal_places);
		$j(displayEle).prop('number', initValue * decimal_factor).animateNumber({
			number: newValue * decimal_factor,
			numberStep: function (now, tween) {
				let floored_number = Math.floor(now) / decimal_factor,
					target = $j(tween.elem);

				if (decimal_places > 0) {
					// force decimal places even if they are 0
					floored_number = floored_number.toFixed(decimal_places);
				}

				target.prop('number', now).text(NumberFormatUtil.formatNumber(floored_number, decimal_places));
			},
			easing: 'easeInQuad'
		}, duration);
	};

	BonusEventHandler.createRewardSlots = function (ring, rateArray, isGoldenEgg) {
			
		let slotAngle = 360 / 12;
		let seed = 0;

		const greenBgImg = $j('<img class="slot-bg-blue" src="'+PageConfig.imagePrefix+'/theme/images/src-common/BONUSEVENT-img/CHANCEGAME/bonus-green-bg.webp" alt="">');
		for (let i = 0; i < 12; i++) {
			let slot = document.createElement('div');

			slot.className = 'slot';

			// compute and assign the transform for this slot
			let transform = 'rotateX(' + (slotAngle * i) + 'deg) translateZ('
					+ 90 + 'px)';

			slot.style.transform = transform;

			// setup the number to show inside the slots
			// the position is randomized to
			let rate = i==0 ? rateArray[0] : rateArray[(i % rateArray.length)];

			$j(slot).append('<p>' + rate + '</p>');
			if(!isGoldenEgg) {
				$j(slot).append(greenBgImg.clone());
			}
			ring.append(slot);
		}
	};
	
	BonusEventHandler.refreshRewardSlots = function (ring) {
		ring.innerHTML = '';
		ring.className = 'ring';
		ring.style = '';
	};
	
	BonusEventHandler.clickRankReward = function(e, key) {
		
		let bonusId = $j(e).attr('bonusId');
		let page = $j(`#PageDiv${bonusId}`);
		let reward = page[0].safeSelector('#rankReward').safeSelector("#" + key + "Reward");
		let rankRewardSetting = $j(e).attr('rankRewardSetting');
		let rankRewardEffect = page[0].safeSelector('#rankRewardEffect');
		let slotBonusGame = page[0].safeSelector('#miniSlotTemplateStage');
		let rankRewardSlot = page[0].safeSelector('#rankRewardSlot');

		if(!BonusEventHandler.takeTicketLock){
			page[0].safeSelector('#rankReward').querySelectorAll('.tournament-badge-box a').
			forEach(elem => {
				if (!elem.classList.contains(key)) {
					elem.classList.remove('active')
				}
			});
			slotBonusGame.classList.remove("select-tour");
			rankRewardEffect.classList.remove("show");
			page[0].safeSelector('#stage').classList.remove("select");
			page[0].classList.remove('daily');
			page[0].classList.remove('weekly');
			page[0].classList.remove('monthly');
				
			rankRewardSlot.className = 'slot-box';
			
			//重新渲染動畫
			rankRewardSlot.offsetWidth;
			
			if (reward.classList.contains('active')) {
				reward.classList.remove('active');
		    } else if (parseInt(page[0].safeSelector('#rankReward').safeSelector("#" + key + "RewardCnt").innerText) > 0){
				reward.classList.add('active');
				rankRewardSlot.classList.add(key);
				page[0].classList.add(key);

				let arr = rankRewardSetting.split(",");
				let uniqueArr = new Array();
				for (let i = 0; i < arr.length; i++) {
					arr[i] = "+" + arr[i] + "%";
					if(arr.indexOf(arr[i]) === i){
						uniqueArr.push(arr[i]);
					}
				}

				BonusEventHandler.refreshRewardSlots(rankRewardSlot.safeSelector("#ring1"));
				BonusEventHandler.createRewardSlots(rankRewardSlot.safeSelector("#ring1"), arr,false);
				rankRewardSlot.safeSelector('.bonus-info').innerHTML = 
					'<span>' +  uniqueArr.join(",") + '</span>';
				slotBonusGame.classList.add("select-tour");
				rankRewardEffect.classList.add("show");
				page[0].safeSelector('#stage').classList.add("select");
			}
			if(page[0].getAttribute('presentType') == 'GOLDEN_EGG'){
				if(rankRewardSlot.style.display == 'none'){
					let skin = page[0].getAttribute('skinName');
					let winArea = document.getElementById(`${skin}WinArea`);
					BonusEventHandler.refreshRewardSlots(winArea.safeSelector("#ring1"));
					let arr = rankRewardSetting.split(",");
					for (let i = 0; i < arr.length; i++) {
						arr[i] = "+" + arr[i] + "%";
					}
					BonusEventHandler.createRewardSlots(winArea.safeSelector("#ring1"), arr,true);
					rankRewardSlot.style.display = 'block';
				}else{
					rankRewardSlot.style.display = 'none';
				}
			}
		}
	};

	
	//TO DO 2023/4/25 由於原先共用邏輯可能無法滿足現行需求，等確認輪盤寶箱小瑪莉的各版型已經有定案之後，
	//未來會重構龍虎榜勳章動畫呈現邏輯
	BonusEventHandler.spinRewardSlots = function(page, response, callback) {
		
		let rateMultiplier = response.rankRewardPercentage;
		let allRateMultiplier = response.rankRewardRateMultiplier;
		
		page.find('#dailyRewardCnt').text(response.rankRecordDailyMedal);
		page.find('#weeklyRewardCnt').text(response.rankRecordWeeklyMedal);
		page.find('#monthlyRewardCnt').text(response.rankRecordMonthlyMedal);
		
		let rankRewardAnime = page[0].querySelector("#rankRewardAnime");
		let handler = BonusEventPresentHandler.getHandler(page.attr('presentType'));

		return new Promise(resolve => {
			AudioPlayer.playMusicOnLoad(handler.dataRewardswift, handler.dataRewardSpin);
		    if(rankRewardAnime){
				if(response.presentType == 'ROULETTE'){
					rankRewardAnime.classList.add('start');
					setTimeout(() => {
			        	page.find('#tournamentObject').addClass('active');
						page.find('#tournamentMove').css('display', 'block');
						if(response.presentType == 'ROULETTE'){
							rankRewardAnime.style.display = 'none';
						}
			    	}, 500);
	
					setTimeout(() => {
						page.find('#rankRewardSlot').addClass('active');
			        	resolve();
			    	}, 700);
				}else if(response.presentType == 'MARIOSLOT'){
					rankRewardAnime.classList.add('start');
					setTimeout(() => {
			        	page.find('#tournamentObject').addClass('active');
						page.find('#tournamentMove').css('display', 'block');
						if(response.presentType == 'ROULETTE'){
							rankRewardAnime.style.display = 'none';
						}
						page.find('#rankRewardSlot').addClass('active');
			        	resolve();
			    	}, 2500);
				}else{
					resolve();
				}
			}else{
				if(response.presentType == 'TREASURE_PICK'){
					page.find("#box" + response.remark).transfer({
						to: page[0].safeSelector('#rankReward').safeSelector("#stage"),
						duration: 1000
					});
					page[0].safeSelector('#rankReward').safeSelector("#stage").classList.add('tt-light');
					setTimeout(() => {
		        		resolve();
		    		}, 1000);
				}else{
					resolve();
				}
			}
		}).then(() => {
			
			let resolveTime = 0;
			if(response.presentType == 'ROULETTE' || response.presentType == 'TREASURE_PICK'){
				resolveTime = 2800;
			}else if (response.presentType == 'MARIOSLOT'){
				resolveTime = 1800;
			}
			
		    return new Promise(resolve => {
		        let element = allRateMultiplier.indexOf(rateMultiplier + "");
		
				page.find('#rankRewardSlot').addClass('active');
				if(response.presentType == 'MARIOSLOT'){
					AudioPlayer.playMusicOnLoad(handler.dataRewardspin, handler.dataClear);
					number = (element + 8) % 12;
		            let ring1 = page[0].safeSelector('#rankRewardSlot').safeSelector("#ring1");
		            ring1.style.animation = 'back-spin 0s, spin-' + number + ' 0s';
		            ring1.className = 'ring spin-' + number;

					setTimeout(() => {
			            page[0].safeSelector('#rankReward').safeSelector("#stage").classList.add('active');
						ring1.querySelectorAll('div')[element].classList.add('active');
			        }, 500);
			        page[0].safeSelector('#rankReward').safeSelector("#stage").classList.add('active');
				}else{
					AudioPlayer.playMusicOnLoad(handler.dataRewardspin, handler.dataClear);
			        setTimeout(() => {
			            page[0].safeSelector('#rankReward').safeSelector("#stage").classList.add('active');
			            number = (element + 8) % 12;
			            let ring1 = page[0].safeSelector('#rankRewardSlot').safeSelector("#ring1");
			            ring1.style.animation = 'back-spin 1s, spin-' + number + ' 1.8s';
			            ring1.className = 'ring spin-' + number;
			        }, 500);
				}
		
		        setTimeout(() => {
		            page[0].safeSelector('#rankReward').safeSelector("#stage").classList.remove('active');
		            let ring1 = page[0].safeSelector('#rankRewardSlot').safeSelector("#ring1");
		            ring1.style.animation = '';
		            ring1.className = 'ring';
		
		            //有需要callback則呼叫
		            if (typeof callback == "function") {
		                callback();
		            }
		
		            if (response.rankRecordDailyMedal != 0) {
		                page.find('#dailyCheckIn').removeClass('no-ticket');
		            } else {
		                page.find('#dailyCheckIn').addClass('no-ticket');
		                page.find('#rankRewardSlot').removeClass('daily');
		            }
		
		            if (response.rankRecordWeeklyMedal != 0) {
		                page.find('#weeklyReward').removeClass('no-ticket');
		            } else {
		                page.find('#weeklyReward').addClass('no-ticket');
		                page.find('#rankRewardSlot').removeClass('weekly');
		            }
		
		            if (response.rankRecordMonthlyMedal != 0) {
		                page.find('#monthlyReward').removeClass('no-ticket');
		            } else {
		                page.find('#monthlyReward').addClass('no-ticket');
		                page.find('#rankRewardSlot').removeClass('monthly');
		            }
		            
					if(rankRewardAnime){
						rankRewardAnime.classList.remove('start');
						rankRewardAnime.style.display = '';
					}
					
					//清空龍虎榜點擊狀態
					page[0].safeSelector('#miniSlotTemplateStage').classList.remove("select-tour");
					page[0].safeSelector('#rankRewardEffect').classList.remove("show");
					page[0].safeSelector('#stage').classList.remove("active");
					page[0].safeSelector('#rankRewardSlot').className = 'slot-box';
					page[0].safeSelector('#stage').classList.remove("select");
					page.find("#rewardType a").removeClass("active");
					
					//清空相關動畫
					page.find('#tournamentObject').removeClass('active');
					page.find('#tournamentMove').css('display', '');

		            resolve();
		        }, resolveTime);
		    });
		});
	};

	//有兩個rankreward slot區塊
	BonusEventHandler.spinEggRewardSlots = function(page,winArea, response) {

		let rateMultiplier = response.rankRewardPercentage;

		let allRateMultiplier = response.rankRewardRateMultiplier;
		page.find('#dailyRewardCnt').text(response.rankRecordDailyMedal);
		page.find('#weeklyRewardCnt').text(response.rankRecordWeeklyMedal);
		page.find('#monthlyRewardCnt').text(response.rankRecordMonthlyMedal);

		winArea.safeSelector('#goldenEggWinBonus').style.display = 'block';
		winArea.safeSelector('#winAreaRankRewardSlot').style.display = 'block';
		winArea.safeSelector('#goldenEggWinBonus').innerHTML = response.award;
		let resolveTime = 2800;

		return new Promise(resolve => {
			let element = allRateMultiplier.indexOf(rateMultiplier + "");

			winArea.safeSelector('#winAreaRankRewardSlot').classList.add('active');

			//AudioPlayer.playMusicOnLoad(handler.dataRewardspin, handler.dataClear);
			setTimeout(() => {
				winArea.safeSelector("#stage").classList.add('active');
				//特殊公式，是當初nick開發時的實測結果，如後續有異常，可以先考慮是其他問題，非相關公式問題
				let number = (element + 8) % 12;
				let ring1 = winArea.safeSelector('#winAreaRankRewardSlot').safeSelector("#ring1");
				ring1.style.animation = 'back-spin 1s, spin-' + number + ' 1.8s';
				ring1.className = 'ring spin-' + number;

			}, 500);

			setTimeout(() => {
				if (response.rankRecordDailyMedal != 0) {
					page.find('#dailyCheckIn').removeClass('no-ticket');
				} else {
					page.find('#dailyCheckIn').addClass('no-ticket');
					page.find('#rankRewardSlot').removeClass('daily');
				}

				if (response.rankRecordWeeklyMedal != 0) {
					page.find('#weeklyReward').removeClass('no-ticket');
				} else {
					page.find('#weeklyReward').addClass('no-ticket');
					page.find('#rankRewardSlot').removeClass('weekly');
				}

				if (response.rankRecordMonthlyMedal != 0) {
					page.find('#monthlyReward').removeClass('no-ticket');
				} else {
					page.find('#monthlyReward').addClass('no-ticket');
					page.find('#rankRewardSlot').removeClass('monthly');
				}
				page.find('#dailyCheckIn').removeClass('active');
				page.find('#weeklyReward').removeClass('active');
				page.find('#monthlyReward').removeClass('active');

				if(response.rankRecordDailyMedal == 0 &&
					response.rankRecordWeeklyMedal == 0 &&
					response.rankRecordMonthlyMedal == 0){
					page.find('#stage').removeClass("select");

					page.find('#bonusGroup').hide();
				}
				//清空龍虎榜點擊狀態

				page.find('#rankRewardSlot').hide().attr('class','slot-box');
				// page.find('#rankRewardSlot').attr('class','slot-box');

				resolve();
			}, resolveTime);
		});

	}
	
	BonusEventHandler.openShop = function(ele){
		if ($j(ele).attr('canShowMall') === 'true') {
			if (GameHallUtils.isNWC()) {
				GameHallHandler.switchIframePage(PageConfig.vipStoreUrl, 'big-iframe', 'Shopping Center');
			} else if (PageConfig.isMobile) {
				window.location.href = '' + PageConfig.vipStoreUrl;
			} else {
				window.open(PageConfig.vipStoreUrl, '_blank');
			}
		}
	}

	//每一個版型開BANK都不一樣，故直接呼叫CLICK事件
	BonusEventHandler.openBank = function(ele){

		//for rwd bs ez
		if ($j("#bankingDeposit").length > 0) {
			$j("#bankingDeposit").click();
			return;
		}

		//for oldgamehall gamehall
		if ($j('#player_banking_deposit').length > 0) {
			$j('#player_banking_deposit').click();
			return;
		}

		//for wl
		if ($j("#depositfooterLink").length > 0) {
			$j("#depositfooterLink").click();
			return;
		}
	}

	BonusEventHandler.bindDailyMissionUnloadEvent = function(gamePage){
		if(gamePage){
			gamePage.addEventListener('load', function() {
				gamePage.addEventListener('beforeunload', function() {
					const element = document.querySelector('.page-bonus-div.dailyCheckIn.active');
					if(element){
						const bonusId = element.getAttribute('bonusid');
						if(bonusId && bonusId !== ''){
							BonusEventHandler.getBonusEventRealTimeInfo(bonusId, true);
						}
					}
				});
			});
		}
	}

	function initSwiper(bonusId) {
        return new Swiper('#barrageSwiper' + bonusId, {
               direction: "vertical",
               watchSlidesProgress: true,
               slidesPerView: 3,
               spaceBetween: 2,
               loop: false,
               autoplay: {
                   delay: 1500,
               }
           });
    }

    // 中獎清單輪播
    function getLatestRedeemTicket(bonusIds) {
        swiperList.forEach(function(swiper) {
            if (swiper) {
                swiper.destroy();
            }
        });
        swiperList = [];
        bonusIds.forEach(function(bonusId) {
			let page = $j(`#PageDiv${bonusId}`);
            postAjax({
                url: PageConfig.getBonusLatestRedeemedTicket,
                data: {
                    bonusId: bonusId,
                    syncUserId: PageConfig.playerSyncUserId
                },
                success: function(response){
                    if (response == null || $j.isEmptyObject(response) || response.error) {
                        if (response.error) {
                            alert(response.error);
                        }
                        return;
                    }
                    let swiperWrapper = page.find('#swiperWrapper');
                    swiperWrapper.empty();
                    response.forEach(function(ticket){
                        let swipeSlide = JCache.get('#swipeSlideTemplate').clone().show();
                        if (ticket.self) {
                            swipeSlide.find('#barrageMessage').addClass('is-you');
                        }
                        swipeSlide.find('#playerInfo').text(ticket.name);
                        let amount;
                        if (ticket.totalFreeSpinAmt > 0) {
                            swipeSlide.find('#freeSpinSpan').show();
                            amount = ticket.totalFreeSpinAmt;
                        } else {
                            amount = MathUtil.decimal.add(ticket.adjustBonusAmt, ticket.rankRewardAmount);
                        }
                        swipeSlide.find('#bonusAmt').text(NumberFormatUtil.formatNumber(amount,2));
                        swiperWrapper.append(swipeSlide);
                    });
                    swiperList.push(initSwiper(bonusId));
                }
            });
        });
    }

	function renderInstantPayTicketInfo(bonusId) {
		let page = JCache.get(`#PageDiv${bonusId}`);
		let lastUpdateTime = page.data('lastUpdateTime');
		let isValidUpdateTime = lastUpdateTime && (Date.now() - lastUpdateTime) >= 12_000;
		if (isValidUpdateTime && page.hasClass('active')) {
			postAjax({
				url: PageConfig.getInstantPayTicketInfo,
				data: {
					bonusId: bonusId,
				},
				success: function (response) {
					if (response) {
						if (response.error) {
							// alert(response.error);
							console.error(response.error)
							return;
						}
						page.attr('ticketCount',response.ticketCount);
						page.find('#ticketCountSpan').text(response.ticketCount);
						BonusEventPresentHandler.showInstantPayTicketInfo(page, response);
					}
				}
			});
		}
	}

	function handleRebateActiveHoursPeriodBlock(bonusEventPage, activeHoursPeriodList, eventStartDateStr){

		let currentDate = new Date();
		let tomorrowDate = new Date().setDate(currentDate.getDate()+1);

		let timezoneOffset = new Date().getTimezoneOffset();
		let offsetHours = parseFloat(MathUtil.decimal.divide(timezoneOffset, 60));
		let eventStartDate = DateUtil.getLocalDate(eventStartDateStr + ':00:00');
		let anyActive = false;

		if(activeHoursPeriodList.length > 0) {
			let periodHtml = `<ul class="num-${activeHoursPeriodList.length}">`;
			for (let i = 0; i < activeHoursPeriodList.length; i++) {
				let period = activeHoursPeriodList[i];
				let startHour = period.startHour;
				let endHour = period.endHour;

				let localStart = new Date(currentDate);
				localStart.setHours(startHour, 0, 0);
				localStart.addHours(-8 - offsetHours);
				let localEnd;
				if (startHour > endHour) {
					localEnd = new Date(tomorrowDate);
					localEnd.setHours(endHour, 0, 0);
				} else {
					localEnd = new Date(currentDate);
					localEnd.setHours(endHour, 0, 0);
				}
				localEnd.addHours(-8 - offsetHours);

				let activeClass = '';
				if (currentDate >= localStart && currentDate < localEnd && currentDate >= eventStartDate) {
					activeClass = 'on';
					anyActive = true;
				}
				let periodStart = localStart.getHours();
				let periodEnd = localEnd.getHours();
				let startMinute = localStart.getMinutes();
				let endMinute = localEnd.getMinutes();

				let periodStartStr = periodStart + '' + (startMinute < 10 ? '0' + startMinute : startMinute);
				let periodEndStr = periodEnd + '' + (endMinute < 10 ? '0' + endMinute : endMinute);
				periodHtml += `<li period-start="${parseInt(periodStartStr)}" period-end="${parseInt(periodEndStr)}" class="${activeClass}"><span>${periodStart}</span>:<span>${startMinute == 0 ? '0' + startMinute : startMinute}</span>-<span>${periodEnd}</span>:<span>${endMinute == 0 ? '0' + startMinute : startMinute}</span></li>`;

			}
			periodHtml += `</ul>`;
			bonusEventPage.safeSelector('#activeHoursPeriodDiv').innerHTML = periodHtml;
		}else{
			anyActive = currentDate >= eventStartDate;
		}

		if(!anyActive){ //當前沒有進行中的, 一律顯示coming soon
			bonusEventPage.classList.add('coming-soon');
			bonusEventPage.safeSelector('#comingSoonTxt').style.display = '';
		}
	}

	BonusEventHandler.processJackpotInfos = function(bonusJackpotInfos) {
		for (let bonusJackpotInfo of bonusJackpotInfos) {
			const sticker = $j(`#${bonusJackpotInfo.bonusId}Div`);
			sticker.data('bonusJackpotInfo', bonusJackpotInfo);

			// if (bonusJackpotInfo.jackpot) {
			// 	RewardAlertUtil.renderAndAnimate({
			// 		eventType: RewardAlertUtil.EventType.BONUS_EVENT,
			// 		rewardItems: [
			// 			new RewardAlertUtil.RewardItem({
			// 				type: RewardAlertUtil.RewardItemType.CASH,
			// 				messageKey: 'player.bonusEvent.msg.winBonus',
			// 				reward: bonusJackpotInfo.jackpot.bonusAmt,
			// 				afterAmt: bonusJackpotInfo.jackpot.afterBalance,
			// 				currency: PageConfig.plChosenCurrencyName
			// 			})
			// 		]
			// 	});
			// }
			BonusEventPresentHandler.showInstantPayTicketInfo($j(`#PageDiv${bonusJackpotInfo.bonusId}`), bonusJackpotInfo, sticker);
			sticker.toggleClass('show-progress');
		}
	}

	BonusEventHandler.successJackpotTickets = new Set();
	BonusEventHandler.processJackpotTickets = function(bonusJackpotTickets) {
		const alertList = [];
		for (let ticket of bonusJackpotTickets) {
			//每次重整後只跳一次
			if(!this.successJackpotTickets.has(ticket.ticketID)) {
				this.successJackpotTickets.add(ticket.ticketID);
				alertList.push(ticket);
			}
		}
		if (alertList.length) {
			for (let ticket of alertList) {
				TaskExecuter.enqueue(function () {

					AudioPlayer.playMusicOnLoad('/theme/media/music/challengeResult.mp3', '/theme/media/music/challengeResult.mp3');

					return RewardAlertUtil.renderAndAnimate({
						eventType: RewardAlertUtil.EventType.BONUS_EVENT,
						rewardItems: [
							new RewardAlertUtil.RewardItem({
								type: RewardAlertUtil.RewardItemType.CASH,
								messageKey: 'player.bonusEvent.msg.winBonus',
								reward: ticket.bonusAmt,
								afterAmt: ticket.afterBalance,
								currency: PageConfig.plChosenCurrencyName
							})
						]
					});
				});
			}
			TaskExecuter.chainReact();
		}
	}
	function showJackpotInstantPayTicket(bonusJackpotInfo) {
		if (bonusJackpotInfo == null || bonusJackpotInfo.ticket == null) {
			return false;
		}
		let ticket = bonusJackpotInfo.ticket;
		let container = $j('#jackpotInstantPayTicketAlert');
		container.find('button').attr('bonusId', ticket.bonusID);
		container.find('#rewardAlertBalance').html($j('#balance').html());
		container.find('#rewardAlertPrize').html(NumberFormatUtil.formatNumber(ticket.bonusAmt, 2));

		let presentHandler = BonusEventPresentHandler.JACKPOT_INSTANT_PAY;
		container.find('#ticketArea').removeClass(Object.values(presentHandler.tierClass)).addClass(presentHandler.tierClass[ticket.ticketTier]);
		container.find('#ticketArea span').html(presentHandler.tierLabel[ticket.ticketTier]);
		PopupUtil.openModal(`#jackpotInstantPayTicketAlert`);
		return true;
	}

	BonusEventHandler.closeJackpotInstantPayTicketList = function () {
		PopupUtil.closeModal('#jackpotInstantPayTicketList');
		$j('#jackpotInstantPayTicketList').find('#bonusTicketWrapper').html('');
	}

	BonusEventHandler.openJackpotInstantPayTicketList = function (e) {
		let bonusId = $j(e).attr('bonusId');
		let formData = {
			'bonusId': bonusId
		};

		postAjax({
			async:false,
			type: 'POST',
			data : formData,
			url: PageConfig.getRedeemedBonusTicket,
			success : function(response) {
				if (response.error ) {
					alert(response.error);
					location.reload();
					return;
				}
				let eventPage = $j(`#PageDiv${bonusId}`);
				let presentHandler = BonusEventPresentHandler.getHandler(eventPage.attr('presentType'));
				let rowWrapper = $j('#jackpotInstantPayTicketList').find('#bonusTicketWrapper');
				if (response.length) {
					let html = "";
					let totalCount = 1;
					function toYYYYMMDD(str) {
						const [datePart] = str.split(' ');
						const [day, month, year] = datePart.split('-');

						return `${year}${month}${day}`;
					}
					response.forEach(function(ticket){
						let tierClass = presentHandler.tierClass[ticket.ticketTier];
						let tierLabel = presentHandler.tierLabel[ticket.ticketTier];
						if (ticket.isJackpot) {
							html +=
								`<li class="history-item ${tierClass}">` +
									`<span class="history-index">${totalCount++}</span>` +
									`<div class="history-info">` +
										`<span class="history-draw-id">${toYYYYMMDD(ticket.multiplyStartTime)}</span>` +
										`<time class="history-time">${toYYYYMMDD(ticket.updateTime)}</time>` +
									`</div>` +
									`<div class="history-reward">` +
										`<span class="ticket-tier-label">${tierLabel}</span>` +
									`</div>` +
									`<div class="history-bonus txt-currency ${PageConfig.chosenCurrency}">${NumberFormatUtil.formatNumber(ticket.adjustBonusAmt,2)}</div>` +
								`</li>`;
						} else {
							html +=
								`<li class="history-item ${tierClass}">` +
									`<span class="history-index">${totalCount++}</span>` +
									`<div class="history-info">` +
										`<span class="history-draw-id">${toYYYYMMDD(ticket.bonusDate)}</span>` +
										`<time class="history-time">${toYYYYMMDD(ticket.updateTime)}</time>` +
									`</div>` +
									`<div class="history-reward">` +
										`<div class="ticket-count">`+
											`<i class="icon icon-ticket"></i>` +
											`<span>${tierLabel}</span>` +
										`</div>` +
									`</div>` +
									`<div class="history-bonus txt-currency ${PageConfig.chosenCurrency}">${NumberFormatUtil.formatNumber(ticket.adjustBonusAmt,2)}</div>` +
								`</li>`;
						}
					});
					rowWrapper.html(html);
				} else {
					rowWrapper.html('<li class="history-item tier-minor no-data"><span>no data</span></li>');
				}
				PopupUtil.openModal("#jackpotInstantPayTicketList");
			},beforeSend:function(){
				PopupUtil.openModal('#loadingMask');
			},
			complete:function(){
				PopupUtil.closeModal('#loadingMask');
			}
		});
	}

	let challengeChoiceDivTemplate =
		`<div class="modal-box modal-challenge hide" id="challengeChoiceDiv">
			<input type="hidden" id="bonusId">
			<input type="hidden" id="ticketId">
			<div class="modal-mask"></div>
				<div class="modal-main">
					<div class="modal-layout">
						<div class="tit">Choose one</div>
						<div class="btn-box">
							<a href="javascript:void(0);" class="btn btn-challenge" onclick="BonusEventHandler.chooseChallenge(true)">
								<div class="tag-challenge">
									<b><span id="bonusMultiplierText"></span>X</b>
								</div>
								<div class="box-money">
									<small class="fix-top" id="multipliedRankRewardDesc"></small>
									<p class="txt-number"> <small class="txt-rate <%=chosenCurrency%>"></small> <span id="multipliedBonus">100</span></p>
								</div>
								<div class="btn-s">
									<%=langMessage.get("player.bonusEvent.text.challenge")%>
								</div>
							</a>
							<a href="javascript:void(0);" class="btn" onclick="BonusEventHandler.chooseChallenge(false)">
								<div class="box-money">
									<small class="fix-top" id="originalRankRewardDesc"></small>
									<p class="txt-number"> <small class="txt-rate <%=chosenCurrency%>"></small> <span id="originalBonus">10</span></p>
								</div>
								<div class="btn-s">
									Collect
								</div>
							</a>
						</div>
						<div class="info-box part-1">
							<ul class="list-dot">
								<li id="directRedeemText"></li>
							</ul>
						</div>
						<div class="info-box part-2">
							<ul class="list-dot" id="challengeText"></ul>
						</div>
					</div>
				</div>
			</div>
		</div>`;
})()
